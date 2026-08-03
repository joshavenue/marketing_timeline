import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { auditEvents, connections } from "@/db/schema";
import { requireWorkspaceAdmin } from "@/lib/auth/access";

const schema = z.object({
  workspaceId: z.string().uuid(),
  hardCapMicros: z.number().int().nonnegative(),
  confirmed: z.literal(true),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ connectionId: string }> },
) {
  try {
    const input = schema.parse(await request.json());
    const admin = await requireWorkspaceAdmin(input.workspaceId);
    const { connectionId } = await context.params;
    const [connection] = await db
      .update(connections)
      .set({ hardCapMicros: String(input.hardCapMicros), updatedAt: new Date() })
      .where(
        and(
          eq(connections.id, connectionId),
          eq(connections.workspaceId, input.workspaceId),
        ),
      )
      .returning({ id: connections.id });
    if (!connection) throw new Error("Connection not found");
    await db.insert(auditEvents).values({
      workspaceId: input.workspaceId,
      actorUserId: admin.userId,
      action: "connection.cap_changed",
      entityType: "connection",
      entityId: connection.id,
      detailsJson: { hardCapMicros: input.hardCapMicros, confirmed: true },
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
