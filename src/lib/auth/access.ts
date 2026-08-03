import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { db } from "@/db/client";
import { memberships, users } from "@/db/schema";
import type { WorkspaceRole } from "@/domain/contracts";

export interface MemberContext {
  workspaceId: string;
  userId: string;
  email: string;
  role: WorkspaceRole;
}

export function canAdmin(role: WorkspaceRole) {
  return role === "admin";
}

export async function requireWorkspaceMember(
  workspaceId: string,
): Promise<MemberContext> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    throw new Error("UNAUTHENTICATED");
  }

  const [membership] = await db
    .select({
      userId: users.id,
      email: users.email,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.workspaceId, workspaceId),
        eq(memberships.active, true),
        eq(users.email, email),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new Error("FORBIDDEN");
  }

  return { workspaceId, ...membership };
}

export async function requireCurrentWorkspaceMember(): Promise<MemberContext> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) throw new Error("UNAUTHENTICATED");

  const [membership] = await db
    .select({
      workspaceId: memberships.workspaceId,
      userId: users.id,
      email: users.email,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(users.email, email), eq(memberships.active, true)))
    .limit(1);

  if (!membership) throw new Error("FORBIDDEN");
  return membership;
}

export async function requireWorkspaceAdmin(
  workspaceId: string,
): Promise<MemberContext> {
  const member = await requireWorkspaceMember(workspaceId);

  if (!canAdmin(member.role)) {
    throw new Error("FORBIDDEN");
  }

  return member;
}
