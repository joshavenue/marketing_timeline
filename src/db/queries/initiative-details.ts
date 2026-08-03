import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  campaigns,
  connections,
  initiativeMetrics,
  initiatives,
  initiativeVersions,
  metricDefinitions,
  metricObservations,
  sourceSnapshots,
  timelineEventContributors,
  timelineEvents,
} from "@/db/schema";

export async function getInitiativeDetail(
  workspaceId: string,
  initiativeId: string,
) {
  const [initiative] = await db
    .select({
      id: initiatives.id,
      name: initiatives.name,
      campaignName: campaigns.name,
      lifecycleStatus: initiatives.lifecycleStatus,
      publicationStatus: initiatives.publicationStatus,
      startDate: initiatives.startDate,
      endDate: initiatives.endDate,
      ownerName: initiatives.ownerName,
      plannedBudget: initiatives.plannedBudget,
      actualSpend: initiatives.actualSpend,
      overview: initiatives.overview,
      sourceUrls: initiatives.sourceUrlsJson,
      sourceState: initiatives.sourceState,
      currentSnapshotId: initiatives.currentSnapshotId,
      updatedAt: initiatives.updatedAt,
    })
    .from(initiatives)
    .leftJoin(campaigns, eq(campaigns.id, initiatives.campaignId))
    .where(
      and(
        eq(initiatives.workspaceId, workspaceId),
        eq(initiatives.id, initiativeId),
      ),
    )
    .limit(1);
  if (!initiative) return null;

  const sourceSnapshotPromise = initiative.currentSnapshotId
    ? db
        .select({
          id: sourceSnapshots.id,
          externalObjectId: sourceSnapshots.externalObjectId,
          observedAt: sourceSnapshots.observedAt,
          checksum: sourceSnapshots.checksum,
          connectionName: connections.name,
        })
        .from(sourceSnapshots)
        .innerJoin(connections, eq(connections.id, sourceSnapshots.connectionId))
        .where(
          and(
            eq(sourceSnapshots.workspaceId, workspaceId),
            eq(sourceSnapshots.id, initiative.currentSnapshotId),
          ),
        )
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : Promise.resolve(null);

  const [contributionRows, metrics, versions, sourceSnapshot] = await Promise.all([
    db
      .select({
        eventId: timelineEvents.id,
        title: timelineEvents.title,
        contributor: timelineEventContributors.contributorName,
        sourceUrls: timelineEvents.sourceUrlsJson,
      })
      .from(timelineEvents)
      .innerJoin(
        timelineEventContributors,
        eq(timelineEventContributors.eventId, timelineEvents.id),
      )
      .where(
        and(
          eq(timelineEvents.workspaceId, workspaceId),
          eq(timelineEvents.initiativeId, initiativeId),
        ),
      )
      .orderBy(
        asc(timelineEvents.startDate),
        asc(timelineEvents.id),
        asc(timelineEventContributors.contributorName),
      ),
    db
      .select({
        id: metricDefinitions.id,
        name: metricDefinitions.name,
        kind: metricDefinitions.kind,
        formulaKey: metricDefinitions.formulaKey,
        externalMetricKey: metricDefinitions.externalMetricKey,
        unit: metricDefinitions.unit,
        value: metricObservations.value,
        freshness: metricObservations.freshness,
        observedAt: metricObservations.observedAt,
        frozenAt: metricObservations.frozenAt,
        sourceUrl: metricObservations.sourceUrl,
        freezeAgeDays: sql<number | null>`coalesce(${metricDefinitions.overrideWindowDays}, ${connections.freezeAgeDays})`,
      })
      .from(initiativeMetrics)
      .innerJoin(
        metricDefinitions,
        eq(metricDefinitions.id, initiativeMetrics.metricDefinitionId),
      )
      .leftJoin(
        metricObservations,
        and(
          eq(metricObservations.metricDefinitionId, metricDefinitions.id),
          eq(metricObservations.initiativeId, initiativeId),
        ),
      )
      .leftJoin(
        connections,
        and(
          eq(connections.workspaceId, metricDefinitions.workspaceId),
          eq(connections.connectorKey, metricDefinitions.connectorKey),
          eq(connections.name, metricDefinitions.connectionName),
        ),
      )
      .where(
        and(
          eq(initiativeMetrics.workspaceId, workspaceId),
          eq(initiativeMetrics.initiativeId, initiativeId),
        ),
      )
      .orderBy(metricDefinitions.name, desc(metricObservations.observedAt)),
    db
      .select({
        version: initiativeVersions.version,
        sourceSnapshotId: initiativeVersions.sourceSnapshotId,
        createdAt: initiativeVersions.createdAt,
      })
      .from(initiativeVersions)
      .where(
        and(
          eq(initiativeVersions.workspaceId, workspaceId),
          eq(initiativeVersions.initiativeId, initiativeId),
        ),
      )
      .orderBy(desc(initiativeVersions.version)),
    sourceSnapshotPromise,
  ]);

  const contributionsByEvent = new Map<
    string,
    { eventId: string; title: string; contributors: string[]; sourceUrls: string[] }
  >();
  for (const row of contributionRows) {
    const current = contributionsByEvent.get(row.eventId) ?? {
      eventId: row.eventId,
      title: row.title,
      contributors: [],
      sourceUrls: Array.isArray(row.sourceUrls)
        ? row.sourceUrls.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
    };
    current.contributors.push(row.contributor);
    contributionsByEvent.set(row.eventId, current);
  }

  return {
    ...initiative,
    contributions: [...contributionsByEvent.values()],
    metrics,
    versions,
    sourceSnapshot,
  };
}
