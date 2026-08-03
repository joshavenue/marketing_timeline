import { and, asc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db/client";
import {
  connections,
  metricDefinitions,
  metricObservations,
} from "@/db/schema";
import type { Freshness, MetricKind } from "@/domain/contracts";

export interface GrowthSeriesOption {
  id: string;
  externalId: string;
  name: string;
  unit: string;
  kind: MetricKind;
  target: string | null;
}

export interface GrowthSeriesPoint {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  value: string;
  freshness: Freshness;
  frozenAt: Date | null;
  observedAt: Date;
  sourceUrl: string;
}

export interface GrowthSeriesRows {
  definition: GrowthSeriesOption;
  freezeAgeDays: number;
  points: GrowthSeriesPoint[];
}

const connectedDefinition = and(
  eq(connections.workspaceId, metricDefinitions.workspaceId),
  eq(connections.connectorKey, metricDefinitions.connectorKey),
  eq(connections.name, metricDefinitions.connectionName),
);

export async function listGrowthSeriesOptions(
  workspaceId: string,
): Promise<GrowthSeriesOption[]> {
  return db
    .select({
      id: metricDefinitions.id,
      externalId: metricDefinitions.externalId,
      name: metricDefinitions.name,
      unit: metricDefinitions.unit,
      kind: metricDefinitions.kind,
      target: metricDefinitions.target,
    })
    .from(metricDefinitions)
    .innerJoin(connections, connectedDefinition)
    .where(
      and(
        eq(metricDefinitions.workspaceId, workspaceId),
        eq(metricDefinitions.publicationStatus, "published"),
      ),
    )
    .orderBy(asc(metricDefinitions.name), asc(metricDefinitions.id));
}

export async function listGrowthSeries(input: {
  workspaceId: string;
  metricDefinitionId: string;
  start: string;
  end: string;
}): Promise<GrowthSeriesRows | null> {
  const [definition] = await db
    .select({
      id: metricDefinitions.id,
      externalId: metricDefinitions.externalId,
      name: metricDefinitions.name,
      unit: metricDefinitions.unit,
      kind: metricDefinitions.kind,
      target: metricDefinitions.target,
      freezeAgeDays: connections.freezeAgeDays,
    })
    .from(metricDefinitions)
    .innerJoin(connections, connectedDefinition)
    .where(
      and(
        eq(metricDefinitions.workspaceId, input.workspaceId),
        eq(metricDefinitions.id, input.metricDefinitionId),
        eq(metricDefinitions.publicationStatus, "published"),
      ),
    )
    .limit(1);
  if (!definition) return null;

  const windowStart = new Date(`${input.start}T00:00:00.000Z`);
  const windowEnd = new Date(`${input.end}T23:59:59.999Z`);
  const points = await db
    .select({
      id: metricObservations.id,
      periodStart: metricObservations.periodStart,
      periodEnd: metricObservations.periodEnd,
      value: metricObservations.value,
      freshness: metricObservations.freshness,
      frozenAt: metricObservations.frozenAt,
      observedAt: metricObservations.observedAt,
      sourceUrl: metricObservations.sourceUrl,
    })
    .from(metricObservations)
    .where(
      and(
        eq(metricObservations.workspaceId, input.workspaceId),
        eq(metricObservations.metricDefinitionId, input.metricDefinitionId),
        lte(metricObservations.periodStart, windowEnd),
        gte(metricObservations.periodEnd, windowStart),
      ),
    )
    .orderBy(
      asc(metricObservations.periodStart),
      asc(metricObservations.id),
    );

  return {
    definition: {
      id: definition.id,
      externalId: definition.externalId,
      name: definition.name,
      unit: definition.unit,
      kind: definition.kind,
      target: definition.target,
    },
    freezeAgeDays: definition.freezeAgeDays,
    points,
  };
}
