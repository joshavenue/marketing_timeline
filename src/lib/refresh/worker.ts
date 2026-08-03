import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  connections,
  refreshJobItems,
  refreshJobs,
  sourceSnapshots,
} from "@/db/schema";
import { getConnector } from "@/lib/connectors/registry";

interface ClaimedItem {
  id: string;
  workspaceId: string;
  jobId: string;
  externalObjectId: string;
  periodStart: Date | null;
  periodEnd: Date | null;
}

function checksum(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function claimQueuedItem(): Promise<ClaimedItem | null> {
  return db.transaction(async (tx) => {
    const result = await tx.execute(sql`
      WITH candidate AS (
        SELECT id
        FROM refresh_job_items
        WHERE status = 'queued'
        ORDER BY created_at, id
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE refresh_job_items AS item
      SET status = 'running', updated_at = NOW()
      FROM candidate
      WHERE item.id = candidate.id
      RETURNING
        item.id,
        item.workspace_id AS "workspaceId",
        item.job_id AS "jobId",
        item.external_object_id AS "externalObjectId",
        item.period_start AS "periodStart",
        item.period_end AS "periodEnd"
    `);
    return (result.rows[0] as unknown as ClaimedItem | undefined) ?? null;
  });
}

export async function runWorkerOnce() {
  const item = await claimQueuedItem();
  if (!item) return null;
  const [context] = await db
    .select({
      connectionId: refreshJobs.connectionId,
      requestedBy: refreshJobs.requestedBy,
      connectorKey: connections.connectorKey,
      estimatedCostMicros: refreshJobItems.estimatedCostMicros,
    })
    .from(refreshJobItems)
    .innerJoin(refreshJobs, eq(refreshJobs.id, refreshJobItems.jobId))
    .innerJoin(connections, eq(connections.id, refreshJobs.connectionId))
    .where(
      and(
        eq(refreshJobItems.id, item.id),
        eq(refreshJobItems.workspaceId, item.workspaceId),
      ),
    )
    .limit(1);
  if (!context) throw new Error("Claimed refresh item lost its job context");

  await db
    .update(refreshJobs)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(refreshJobs.id, item.jobId));
  try {
    const connector = getConnector(context.connectorKey);
    const request = {
      workspaceId: item.workspaceId,
      connectionId: context.connectionId,
      operationKey: "read",
      externalObjectId: item.externalObjectId,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      actorUserId: context.requestedBy,
    };
    const capability = connector.validateCapability(request);
    if (!capability.valid) throw new Error(capability.reason ?? "Invalid capability");
    const result = await connector.read(request);
    const snapshot = result.snapshotManaged
      ? null
      : (
          await db
            .insert(sourceSnapshots)
            .values({
              workspaceId: item.workspaceId,
              connectionId: context.connectionId,
              externalObjectId: item.externalObjectId,
              operationKey: request.operationKey,
              requestScopeJson: {
                periodStart: item.periodStart?.toISOString() ?? null,
                periodEnd: item.periodEnd?.toISOString() ?? null,
              },
              requestChecksum: checksum(request),
              responseJson: result.response,
              responseHeadersJson: result.responseHeaders ?? {},
              checksum: checksum(result.response),
              observedAt: result.observedAt,
            })
            .returning({ id: sourceSnapshots.id })
        )[0]!;
    await db.transaction(async (tx) => {
      await tx
        .update(refreshJobItems)
        .set({ status: "succeeded", snapshotId: snapshot?.id })
        .where(eq(refreshJobItems.id, item.id));
      await tx
        .update(connections)
        .set({
          periodUsageMicros: sql`${connections.periodUsageMicros} + ${context.estimatedCostMicros}`,
          lastSuccessAt: new Date(),
          health: "healthy",
        })
        .where(eq(connections.id, context.connectionId));
      const [{ remaining }] = await tx
        .select({ remaining: sql<number>`count(*)` })
        .from(refreshJobItems)
        .where(
          and(
            eq(refreshJobItems.jobId, item.jobId),
            eq(refreshJobItems.status, "queued"),
          ),
        );
      if (Number(remaining) === 0) {
        await tx
          .update(refreshJobs)
          .set({ status: "succeeded", finishedAt: new Date() })
          .where(eq(refreshJobs.id, item.jobId));
      }
    });
    return { itemId: item.id, status: "succeeded" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connector read failed";
    const retryAt =
      error instanceof Error && "retryAt" in error && error.retryAt instanceof Date
        ? error.retryAt
        : null;
    await db.transaction(async (tx) => {
      await tx
        .update(refreshJobItems)
        .set({ status: "failed", errorCode: "READ_FAILED", errorMessage: message })
        .where(eq(refreshJobItems.id, item.id));
      await tx
        .update(refreshJobs)
        .set({
          status: "failed",
          errorCode: "READ_FAILED",
          errorMessage: message,
          retryAt,
          finishedAt: new Date(),
        })
        .where(eq(refreshJobs.id, item.jobId));
    });
    return { itemId: item.id, status: "failed" as const };
  }
}
