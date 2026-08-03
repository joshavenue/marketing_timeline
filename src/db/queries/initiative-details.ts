import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  campaigns,
  initiativeMetrics,
  initiatives,
  initiativeVersions,
  metricDefinitions,
  metricObservations,
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

  const [contributions, metrics, versions] = await Promise.all([
    db
      .select({
        title: timelineEvents.title,
        contributor: timelineEventContributors.contributorName,
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
        observedAt: metricObservations.observedAt,
        frozenAt: metricObservations.frozenAt,
        sourceUrl: metricObservations.sourceUrl,
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
  ]);

  return { ...initiative, contributions, metrics, versions };
}
