import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { invitations, memberships, users } from "@/db/schema";
import type { WorkspaceRole } from "@/domain/contracts";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export interface CreateInvitationInput {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
}

export async function createInvitation(input: CreateInvitationInput) {
  const token = randomBytes(32).toString("base64url");
  const email = normalizeEmail(input.email);
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  await db
    .insert(invitations)
    .values({
      workspaceId: input.workspaceId,
      email,
      role: input.role,
      tokenHash: hashToken(token),
      expiresAt,
      invitedBy: input.invitedBy,
    })
    .onConflictDoUpdate({
      target: [invitations.workspaceId, invitations.email],
      set: {
        role: input.role,
        tokenHash: hashToken(token),
        expiresAt,
        acceptedAt: null,
        invitedBy: input.invitedBy,
      },
    });

  return { token };
}

export async function acceptInvitation(token: string, googleEmail: string) {
  const tokenHash = hashToken(token);
  const email = normalizeEmail(googleEmail);

  await db.transaction(async (transaction) => {
    const [invitation] = await transaction
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.tokenHash, tokenHash),
          isNull(invitations.acceptedAt),
          gt(invitations.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!invitation) {
      throw new Error("Invitation is no longer valid");
    }

    if (invitation.email !== email) {
      throw new Error("Invitation email does not match");
    }

    const [user] = await transaction
      .insert(users)
      .values({ email })
      .onConflictDoUpdate({
        target: users.email,
        set: { updatedAt: new Date() },
      })
      .returning({ id: users.id });

    await transaction
      .insert(memberships)
      .values({
        workspaceId: invitation.workspaceId,
        userId: user!.id,
        role: invitation.role,
        active: true,
      })
      .onConflictDoUpdate({
        target: [memberships.workspaceId, memberships.userId],
        set: {
          role: invitation.role,
          active: true,
          updatedAt: new Date(),
        },
      });

    await transaction
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(
        and(
          eq(invitations.id, invitation.id),
          isNull(invitations.acceptedAt),
        ),
      );
  });
}

export async function hasActiveMembershipOrInvitation(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const [membership] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(users.email, email), eq(memberships.active, true)))
    .limit(1);

  if (membership) {
    return true;
  }

  const [invitation] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(
        eq(invitations.email, email),
        isNull(invitations.acceptedAt),
        gt(invitations.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return Boolean(invitation);
}
