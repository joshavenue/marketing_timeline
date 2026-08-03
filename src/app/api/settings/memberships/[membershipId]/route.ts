import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { auditEvents, memberships } from "@/db/schema";
import { requireWorkspaceAdmin } from "@/lib/auth/access";

const schema = z.object({
  workspaceId: z.string().uuid(),
  role: z.enum(["admin", "member"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ membershipId: string }> },
) {
  try {
    const input = schema.parse(await request.json());
    const admin = await requireWorkspaceAdmin(input.workspaceId);
    const { membershipId } = await context.params;
    const [target] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.id, membershipId),
          eq(memberships.workspaceId, input.workspaceId),
        ),
      )
      .limit(1);
    if (!target) throw new Error("Membership not found");
    if (target.role === "admin" && input.role === "member") {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(memberships)
        .where(
          and(
            eq(memberships.workspaceId, input.workspaceId),
            eq(memberships.role, "admin"),
            eq(memberships.active, true),
          ),
        );
      if (Number(count) <= 1) throw new Error("Cannot demote the last admin");
    }
    await db.transaction(async (tx) => {
      await tx
        .update(memberships)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(memberships.id, membershipId));
      await tx.insert(auditEvents).values({
        workspaceId: input.workspaceId,
        actorUserId: admin.userId,
        action: "membership.role_changed",
        entityType: "membership",
        entityId: membershipId,
        detailsJson: { from: target.role, to: input.role },
      });
    });
    return NextResponse.json({ saved: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json(
      { error: message },
      { status: message === "FORBIDDEN" ? 403 : 400 },
    );
  }
}
