import { createHash } from "node:crypto";
import { and, desc, eq, inArray, notInArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import {
  auditEvents,
  campaigns,
  campaignVersions,
  connections,
  initiativeMetrics,
  initiatives,
  initiativeVersions,
  metricDefinitions,
  metricObservations,
  sourceSnapshots,
  timelineEventContributors,
  timelineEvents,
  timelineEventVersions,
} from "@/db/schema";
import { decryptSecret } from "@/lib/crypto/secrets";
import {
  readCanonicalNotionPages,
  type CanonicalNotionDatabaseIds,
} from "@/lib/notion/client";
import type {
  CanonicalCampaign,
  CanonicalEvent,
  CanonicalInitiative,
  CanonicalMetricDefinition,
  CanonicalObservation,
  CanonicalRecord,
} from "@/lib/notion/canonical";
import { validateCanonicalPage } from "@/lib/notion/validate";

export interface NotionSyncReport {
  created: string[];
  updated: string[];
  unchanged: string[];
  archived: string[];
  invalid: Array<{ sourceId: string; sourceUrl: string; errors: string[] }>;
}

const connectionConfigSchema = z.object({
  databaseIds: z.object({
    campaigns: z.string().min(1),
    initiatives: z.string().min(1),
    events: z.string().min(1),
    metrics: z.string().min(1),
    observations: z.string().min(1),
  }),
});

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

function stableJson(value: unknown) {
  return JSON.stringify(stableValue(value));
}

function checksum(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function resultKey(record: CanonicalRecord) {
  return `${record.type}:${record.externalId}`;
}

async function persistSnapshot(input: {
  workspaceId: string;
  connectionId: string;
  record: CanonicalRecord;
  raw: unknown;
}) {
  const requestScope = {
    recordType: input.record.type,
    sourceId: input.record.externalId,
  };
  const requestChecksum = checksum(requestScope);
  const responseChecksum = checksum(input.raw);
  const [inserted] = await db
    .insert(sourceSnapshots)
    .values({
      workspaceId: input.workspaceId,
      connectionId: input.connectionId,
      externalObjectId: input.record.externalId,
      operationKey: `notion.${input.record.type}.read`,
      requestScopeJson: requestScope,
      requestChecksum,
      responseJson: stableValue(input.raw),
      responseHeadersJson: {},
      checksum: responseChecksum,
      observedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning({ id: sourceSnapshots.id });

  if (inserted) return inserted.id;

  const [existing] = await db
    .select({ id: sourceSnapshots.id })
    .from(sourceSnapshots)
    .where(
      and(
        eq(sourceSnapshots.workspaceId, input.workspaceId),
        eq(sourceSnapshots.connectionId, input.connectionId),
        eq(sourceSnapshots.externalObjectId, input.record.externalId),
        eq(
          sourceSnapshots.operationKey,
          `notion.${input.record.type}.read`,
        ),
        eq(sourceSnapshots.requestChecksum, requestChecksum),
        eq(sourceSnapshots.checksum, responseChecksum),
      ),
    )
    .limit(1);

  if (!existing) throw new Error("Snapshot persistence failed");
  return existing.id;
}

async function syncCampaign(
  workspaceId: string,
  record: CanonicalCampaign,
  snapshotId: string,
) {
  const [current] = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.workspaceId, workspaceId),
        eq(campaigns.externalId, record.externalId),
      ),
    )
    .limit(1);
  const values = {
    workspaceId,
    externalId: record.externalId,
    name: record.name,
    lifecycleStatus: record.lifecycleStatus,
    publicationStatus: record.publicationStatus,
    startDate: record.startDate,
    endDate: record.endDate,
    ownerName: record.ownerName,
    objective: record.objective,
    displayLevel: record.displayLevel,
    sourceUrlsJson: [record.sourceUrl, ...record.sourceRecordUrls],
    sourceState: "active" as const,
    currentSnapshotId: snapshotId,
  };

  if (!current) {
    const [created] = await db
      .insert(campaigns)
      .values(values)
      .returning({ id: campaigns.id });
    await db.insert(campaignVersions).values({
      workspaceId,
      campaignId: created!.id,
      version: 1,
      recordJson: record,
      sourceSnapshotId: snapshotId,
    });
    return "created" as const;
  }
  if (
    current.currentSnapshotId === snapshotId &&
    current.sourceState !== "deleted"
  ) {
    return "unchanged" as const;
  }

  const [latest] = await db
    .select({ version: campaignVersions.version })
    .from(campaignVersions)
    .where(
      and(
        eq(campaignVersions.workspaceId, workspaceId),
        eq(campaignVersions.campaignId, current.id),
      ),
    )
    .orderBy(desc(campaignVersions.version))
    .limit(1);
  await db.transaction(async (transaction) => {
    await transaction.insert(campaignVersions).values({
      workspaceId,
      campaignId: current.id,
      version: (latest?.version ?? 0) + 1,
      recordJson: record,
      sourceSnapshotId: snapshotId,
    });
    await transaction
      .update(campaigns)
      .set({ ...values, sourceState: "changed", updatedAt: new Date() })
      .where(
        and(eq(campaigns.workspaceId, workspaceId), eq(campaigns.id, current.id)),
      );
  });
  return "updated" as const;
}

async function syncInitiative(
  workspaceId: string,
  record: CanonicalInitiative,
  snapshotId: string,
) {
  const [parent] = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(
      and(
        eq(campaigns.workspaceId, workspaceId),
        eq(campaigns.externalId, record.campaignExternalId),
      ),
    )
    .limit(1);
  if (!parent) throw new Error("Related Campaign does not exist");

  const [current] = await db
    .select()
    .from(initiatives)
    .where(
      and(
        eq(initiatives.workspaceId, workspaceId),
        eq(initiatives.externalId, record.externalId),
      ),
    )
    .limit(1);
  const values = {
    workspaceId,
    externalId: record.externalId,
    campaignId: parent.id,
    name: record.name,
    lifecycleStatus: record.lifecycleStatus,
    publicationStatus: record.publicationStatus,
    startDate: record.startDate,
    endDate: record.endDate,
    ownerName: record.ownerName,
    plannedBudget:
      record.plannedBudget === null ? null : String(record.plannedBudget),
    actualSpend:
      record.actualSpend === null ? null : String(record.actualSpend),
    overview: record.overview,
    attributionTemplate: record.attributionTemplate,
    displayLevel: record.displayLevel,
    sourceUrlsJson: [record.sourceUrl, ...record.sourceRecordUrls],
    sourceState: "active" as const,
    currentSnapshotId: snapshotId,
  };

  if (!current) {
    const [created] = await db
      .insert(initiatives)
      .values(values)
      .returning({ id: initiatives.id });
    await db.insert(initiativeVersions).values({
      workspaceId,
      initiativeId: created!.id,
      version: 1,
      recordJson: record,
      sourceSnapshotId: snapshotId,
    });
    return "created" as const;
  }
  if (
    current.currentSnapshotId === snapshotId &&
    current.sourceState !== "deleted"
  ) {
    return "unchanged" as const;
  }

  const [latest] = await db
    .select({ version: initiativeVersions.version })
    .from(initiativeVersions)
    .where(
      and(
        eq(initiativeVersions.workspaceId, workspaceId),
        eq(initiativeVersions.initiativeId, current.id),
      ),
    )
    .orderBy(desc(initiativeVersions.version))
    .limit(1);
  await db.transaction(async (transaction) => {
    await transaction.insert(initiativeVersions).values({
      workspaceId,
      initiativeId: current.id,
      version: (latest?.version ?? 0) + 1,
      recordJson: record,
      sourceSnapshotId: snapshotId,
    });
    await transaction
      .update(initiatives)
      .set({ ...values, sourceState: "changed", updatedAt: new Date() })
      .where(
        and(
          eq(initiatives.workspaceId, workspaceId),
          eq(initiatives.id, current.id),
        ),
      );
  });
  return "updated" as const;
}

async function syncEvent(
  workspaceId: string,
  record: CanonicalEvent,
  snapshotId: string,
) {
  const [parent] = await db
    .select({ id: initiatives.id })
    .from(initiatives)
    .where(
      and(
        eq(initiatives.workspaceId, workspaceId),
        eq(initiatives.externalId, record.initiativeExternalId),
      ),
    )
    .limit(1);
  if (!parent) throw new Error("Related Initiative does not exist");
  const [current] = await db
    .select()
    .from(timelineEvents)
    .where(
      and(
        eq(timelineEvents.workspaceId, workspaceId),
        eq(timelineEvents.externalId, record.externalId),
      ),
    )
    .limit(1);
  const values = {
    workspaceId,
    externalId: record.externalId,
    initiativeId: parent.id,
    title: record.title,
    kind: record.kind,
    publicationStatus: record.publicationStatus,
    startDate: record.startDate,
    endDate: record.endDate,
    context: record.context,
    externalUrlsJson: record.externalObjectUrls,
    sourceUrlsJson: [record.sourceUrl, ...record.sourceRecordUrls],
    displayLevel: record.displayLevel,
    sourceState: "active" as const,
    currentSnapshotId: snapshotId,
  };

  if (!current) {
    const [created] = await db
      .insert(timelineEvents)
      .values(values)
      .returning({ id: timelineEvents.id });
    await db.insert(timelineEventVersions).values({
      workspaceId,
      eventId: created!.id,
      version: 1,
      recordJson: record,
      sourceSnapshotId: snapshotId,
    });
    if (record.contributors.length) {
      await db.insert(timelineEventContributors).values(
        record.contributors.map((contributor) => ({
          workspaceId,
          eventId: created!.id,
          contributorName: contributor.name,
          notionUserId: contributor.notionUserId,
        })),
      );
    }
    return "created" as const;
  }
  if (
    current.currentSnapshotId === snapshotId &&
    current.sourceState !== "deleted"
  ) {
    return "unchanged" as const;
  }

  const [latest] = await db
    .select({ version: timelineEventVersions.version })
    .from(timelineEventVersions)
    .where(
      and(
        eq(timelineEventVersions.workspaceId, workspaceId),
        eq(timelineEventVersions.eventId, current.id),
      ),
    )
    .orderBy(desc(timelineEventVersions.version))
    .limit(1);
  await db.transaction(async (transaction) => {
    await transaction.insert(timelineEventVersions).values({
      workspaceId,
      eventId: current.id,
      version: (latest?.version ?? 0) + 1,
      recordJson: record,
      sourceSnapshotId: snapshotId,
    });
    await transaction
      .update(timelineEvents)
      .set({ ...values, sourceState: "changed", updatedAt: new Date() })
      .where(
        and(
          eq(timelineEvents.workspaceId, workspaceId),
          eq(timelineEvents.id, current.id),
        ),
      );
    await transaction
      .delete(timelineEventContributors)
      .where(
        and(
          eq(timelineEventContributors.workspaceId, workspaceId),
          eq(timelineEventContributors.eventId, current.id),
        ),
      );
    if (record.contributors.length) {
      await transaction.insert(timelineEventContributors).values(
        record.contributors.map((contributor) => ({
          workspaceId,
          eventId: current.id,
          contributorName: contributor.name,
          notionUserId: contributor.notionUserId,
        })),
      );
    }
  });
  return "updated" as const;
}

async function syncMetric(
  workspaceId: string,
  record: CanonicalMetricDefinition,
  snapshotId: string,
) {
  const [current] = await db
    .select()
    .from(metricDefinitions)
    .where(
      and(
        eq(metricDefinitions.workspaceId, workspaceId),
        eq(metricDefinitions.externalId, record.externalId),
      ),
    )
    .limit(1);
  const values = {
    workspaceId,
    externalId: record.externalId,
    name: record.name,
    kind: record.kind,
    connectorKey: record.connectorKey,
    connectionName: record.connectionName,
    externalMetricKey: record.externalMetricKey,
    unit: record.unit,
    aggregation: record.aggregation,
    target: record.target === null ? null : String(record.target),
    attributionTemplate: record.attributionTemplate,
    overrideWindowDays: record.overrideWindowDays,
    formulaKey: record.formulaKey,
    publicationStatus: record.publicationStatus,
    sourceState: "active" as const,
    currentSnapshotId: snapshotId,
  };
  let metricId: string;
  let outcome: "created" | "updated" | "unchanged";

  if (!current) {
    const [created] = await db
      .insert(metricDefinitions)
      .values(values)
      .returning({ id: metricDefinitions.id });
    metricId = created!.id;
    outcome = "created";
  } else if (
    current.currentSnapshotId === snapshotId &&
    current.sourceState !== "deleted"
  ) {
    metricId = current.id;
    outcome = "unchanged";
  } else {
    metricId = current.id;
    await db
      .update(metricDefinitions)
      .set({ ...values, sourceState: "changed", updatedAt: new Date() })
      .where(
        and(
          eq(metricDefinitions.workspaceId, workspaceId),
          eq(metricDefinitions.id, current.id),
        ),
      );
    outcome = "updated";
  }

  if (outcome !== "unchanged") {
    await db
      .delete(initiativeMetrics)
      .where(
        and(
          eq(initiativeMetrics.workspaceId, workspaceId),
          eq(initiativeMetrics.metricDefinitionId, metricId),
        ),
      );
    if (record.relatedInitiativeExternalIds.length) {
      const related = await db
        .select({ id: initiatives.id })
        .from(initiatives)
        .where(
          and(
            eq(initiatives.workspaceId, workspaceId),
            inArray(
              initiatives.externalId,
              record.relatedInitiativeExternalIds,
            ),
          ),
        );
      if (related.length !== record.relatedInitiativeExternalIds.length) {
        throw new Error("One or more Related Initiatives do not exist");
      }
      await db.insert(initiativeMetrics).values(
        related.map((initiative) => ({
          workspaceId,
          initiativeId: initiative.id,
          metricDefinitionId: metricId,
        })),
      );
    }
  }
  return outcome;
}

async function syncObservation(
  workspaceId: string,
  record: CanonicalObservation,
  snapshotId: string,
) {
  const [metric] = await db
    .select({ id: metricDefinitions.id })
    .from(metricDefinitions)
    .where(
      and(
        eq(metricDefinitions.workspaceId, workspaceId),
        eq(metricDefinitions.externalId, record.metricExternalId),
      ),
    )
    .limit(1);
  if (!metric) throw new Error("Related Metric does not exist");

  let initiativeId: string | null = null;
  if (record.initiativeExternalId) {
    const [initiative] = await db
      .select({ id: initiatives.id })
      .from(initiatives)
      .where(
        and(
          eq(initiatives.workspaceId, workspaceId),
          eq(initiatives.externalId, record.initiativeExternalId),
        ),
      )
      .limit(1);
    if (!initiative) throw new Error("Related Initiative does not exist");
    initiativeId = initiative.id;
  }

  const [created] = await db
    .insert(metricObservations)
    .values({
      workspaceId,
      metricDefinitionId: metric.id,
      initiativeId,
      sourceSnapshotId: snapshotId,
      periodStart: new Date(`${record.periodStart}T00:00:00.000Z`),
      periodEnd: new Date(`${record.periodEnd}T23:59:59.999Z`),
      value: String(record.value),
      unit: record.unit,
      freshness: "fresh",
      sourceUrl: record.sourceReference,
      observedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning({ id: metricObservations.id });
  return created ? ("created" as const) : ("unchanged" as const);
}

async function archiveMissing(
  workspaceId: string,
  seen: Record<"campaign" | "initiative" | "event" | "metric_definition", string[]>,
  report: NotionSyncReport,
) {
  const targets = [
    { type: "campaign" as const, table: campaigns },
    { type: "initiative" as const, table: initiatives },
    { type: "event" as const, table: timelineEvents },
    { type: "metric_definition" as const, table: metricDefinitions },
  ];

  for (const target of targets) {
    const condition =
      seen[target.type].length > 0
        ? and(
            eq(target.table.workspaceId, workspaceId),
            notInArray(target.table.externalId, seen[target.type]),
          )
        : eq(target.table.workspaceId, workspaceId);
    const rows = await db
      .update(target.table)
      .set({ sourceState: "deleted", updatedAt: new Date() })
      .where(condition)
      .returning({ externalId: target.table.externalId });
    report.archived.push(
      ...rows.map((row) => `${target.type}:${row.externalId}`),
    );
  }
}

export async function syncNotionWorkspace(input: {
  workspaceId: string;
  connectionId: string;
  actorUserId: string;
}): Promise<NotionSyncReport> {
  const [connection] = await db
    .select()
    .from(connections)
    .where(
      and(
        eq(connections.workspaceId, input.workspaceId),
        eq(connections.id, input.connectionId),
        eq(connections.connectorKey, "notion"),
      ),
    )
    .limit(1);
  if (!connection?.credentialsCiphertext) {
    throw new Error("Configured Notion connection was not found");
  }
  const config = connectionConfigSchema.parse(connection.configJson);
  const rawPages = await readCanonicalNotionPages({
    token: decryptSecret(connection.credentialsCiphertext),
    databaseIds: config.databaseIds as CanonicalNotionDatabaseIds,
  });
  const report: NotionSyncReport = {
    created: [],
    updated: [],
    unchanged: [],
    archived: [],
    invalid: [],
  };
  const valid: Array<{ raw: unknown; record: CanonicalRecord }> = [];

  for (const raw of rawPages) {
    const validation = validateCanonicalPage(raw);
    if (validation.status === "valid") {
      valid.push({ raw, record: validation.record });
    } else if (validation.status === "invalid") {
      const rawRecord =
        raw && typeof raw === "object"
          ? (raw as Record<string, unknown>)
          : {};
      report.invalid.push({
        sourceId: String(rawRecord.sourceId ?? "unknown"),
        sourceUrl: String(rawRecord.sourceUrl ?? ""),
        errors: validation.errors,
      });
    }
  }

  const order = {
    campaign: 0,
    initiative: 1,
    event: 2,
    metric_definition: 3,
    observation: 4,
  } as const;
  valid.sort((left, right) => order[left.record.type] - order[right.record.type]);
  const seen = {
    campaign: [] as string[],
    initiative: [] as string[],
    event: [] as string[],
    metric_definition: [] as string[],
  };

  for (const item of valid) {
    if (item.record.type !== "observation") {
      seen[item.record.type].push(item.record.externalId);
    }
    try {
      const snapshotId = await persistSnapshot({
        workspaceId: input.workspaceId,
        connectionId: input.connectionId,
        record: item.record,
        raw: item.raw,
      });
      const outcome =
        item.record.type === "campaign"
          ? await syncCampaign(input.workspaceId, item.record, snapshotId)
          : item.record.type === "initiative"
            ? await syncInitiative(input.workspaceId, item.record, snapshotId)
            : item.record.type === "event"
              ? await syncEvent(input.workspaceId, item.record, snapshotId)
              : item.record.type === "metric_definition"
                ? await syncMetric(input.workspaceId, item.record, snapshotId)
                : await syncObservation(
                    input.workspaceId,
                    item.record,
                    snapshotId,
                  );
      report[outcome].push(resultKey(item.record));
    } catch (error) {
      report.invalid.push({
        sourceId: item.record.externalId,
        sourceUrl: item.record.sourceUrl,
        errors: [error instanceof Error ? error.message : "Import failed"],
      });
    }
  }

  await archiveMissing(input.workspaceId, seen, report);
  await db.insert(auditEvents).values({
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    action: "notion.sync.completed",
    entityType: "connection",
    entityId: input.connectionId,
    detailsJson: {
      created: report.created.length,
      updated: report.updated.length,
      unchanged: report.unchanged.length,
      archived: report.archived.length,
      invalid: report.invalid.length,
    },
  });

  return report;
}
