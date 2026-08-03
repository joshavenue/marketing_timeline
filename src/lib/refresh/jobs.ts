import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  connections,
  memberships,
  refreshJobItems,
  refreshJobs,
} from "@/db/schema";
import {
  evaluateRefreshPreflight,
  type RefreshObject,
} from "@/lib/refresh/preflight";

function utcMonthStart(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function idempotencyKey(input: {
  workspaceId: string;
  connectionId: string;
  object: RefreshObject;
}) {
  return createHash("sha256")
    .update(
      [
        input.workspaceId,
        input.connectionId,
        input.object.operationKey ?? "read",
        input.object.externalObjectId,
        input.object.periodStart?.toISOString() ?? "",
        input.object.periodEnd?.toISOString() ?? "",
      ].join(":"),
    )
    .digest("hex");
}

export async function createApprovedRefreshJob(input: {
  workspaceId: string;
  connectionId: string;
  requestedBy: string;
  objects: RefreshObject[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const [member] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(
      and(
        eq(memberships.workspaceId, input.workspaceId),
        eq(memberships.userId, input.requestedBy),
        eq(memberships.active, true),
      ),
    )
    .limit(1);
  const [connection] = await db
    .select()
    .from(connections)
    .where(
      and(
        eq(connections.id, input.connectionId),
        eq(connections.workspaceId, input.workspaceId),
      ),
    )
    .limit(1);
  if (!connection) throw new Error("Connection not found");
  const monthStart = utcMonthStart(now);
  const periodUsageMicros =
    connection.usagePeriodStart === monthStart
      ? Number(connection.periodUsageMicros)
      : 0;
  if (connection.usagePeriodStart !== monthStart) {
    await db
      .update(connections)
      .set({ usagePeriodStart: monthStart, periodUsageMicros: "0" })
      .where(eq(connections.id, connection.id));
  }
  const preflight = evaluateRefreshPreflight({
    connectorKey: connection.connectorKey,
    role: member?.role ?? "member",
    objects: input.objects,
    now,
    freezeAgeDays: connection.freezeAgeDays,
    costPerOperationMicros: Number(connection.costPerOperationMicros),
    hardCapMicros: Number(connection.hardCapMicros),
    periodUsageMicros,
  });
  if (!preflight.canApprove) throw new Error(preflight.blockers[0]);

  return db.transaction(async (tx) => {
    const [job] = await tx
      .insert(refreshJobs)
      .values({
        workspaceId: input.workspaceId,
        connectionId: input.connectionId,
        requestedBy: input.requestedBy,
        status: "queued",
        requestJson: { objects: input.objects },
        estimatedCostMicros: String(preflight.estimatedCostMicros),
        approvedAt: now,
      })
      .returning();
    await tx.insert(refreshJobItems).values(
      preflight.eligible.map((object) => ({
        workspaceId: input.workspaceId,
        jobId: job!.id,
        externalObjectId: object.externalObjectId,
        periodStart: object.periodStart,
        periodEnd: object.periodEnd,
        idempotencyKey: idempotencyKey({
          workspaceId: input.workspaceId,
          connectionId: input.connectionId,
          object,
        }),
        status: "queued" as const,
        estimatedCostMicros: String(
          connection.connectorKey === "notion"
            ? 0
            : Number(connection.costPerOperationMicros),
        ),
      })),
    );
    return { job: job!, preflight };
  });
}
