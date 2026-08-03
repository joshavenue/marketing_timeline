import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { connections } from "@/db/schema";
import {
  requireCurrentWorkspaceMember,
  requireWorkspaceAdmin,
} from "@/lib/auth/access";
import { evaluateRefreshPreflight } from "@/lib/refresh/preflight";

const schema = z.object({
  connectionId: z.string().uuid(),
  objects: z.array(
    z.object({
      externalObjectId: z.string().min(1),
      operationKey: z.string().optional(),
      observedAt: z.coerce.date().nullish(),
      periodStart: z.coerce.date().nullish(),
      periodEnd: z.coerce.date().nullish(),
    }),
  ).min(1),
});

export async function POST(request: Request) {
  try {
    const current = await requireCurrentWorkspaceMember();
    const admin = await requireWorkspaceAdmin(current.workspaceId);
    const input = schema.parse(await request.json());
    const [connection] = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.id, input.connectionId),
          eq(connections.workspaceId, admin.workspaceId),
        ),
      )
      .limit(1);
    if (!connection) throw new Error("Connection not found");
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    )
      .toISOString()
      .slice(0, 10);
    const periodUsageMicros =
      connection.usagePeriodStart === monthStart
        ? Number(connection.periodUsageMicros)
        : 0;
    return NextResponse.json({
      preflight: evaluateRefreshPreflight({
        connectorKey: connection.connectorKey,
        role: admin.role,
        objects: input.objects,
        now,
        freezeAgeDays: connection.freezeAgeDays,
        costPerOperationMicros: Number(connection.costPerOperationMicros),
        hardCapMicros: Number(connection.hardCapMicros),
        periodUsageMicros,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
