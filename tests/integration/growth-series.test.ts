import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import {
  connections,
  metricDefinitions,
  metricObservations,
  sourceSnapshots,
} from "@/db/schema";
import {
  listGrowthSeries,
  listGrowthSeriesOptions,
} from "@/db/queries/growth-series";
import { createWorkspace } from "@/db/queries/workspaces";
import { getTimelineWindow } from "@/lib/timeline/query";
import { closeDatabasePool, resetDatabase } from "../helpers/database";

describe("workspace-scoped growth series", () => {
  beforeEach(resetDatabase);
  afterAll(closeDatabasePool);

  it("returns only published options from the requested workspace", async () => {
    const workspaceA = await createWorkspace("Workspace A");
    const workspaceB = await createWorkspace("Workspace B");
    await db.insert(connections).values([
      {
        workspaceId: workspaceA.id,
        connectorKey: "x_account",
        name: "X account",
        usagePeriodStart: "2026-08-01",
        freezeAgeDays: 30,
      },
      {
        workspaceId: workspaceB.id,
        connectorKey: "x_account",
        name: "X account",
        usagePeriodStart: "2026-08-01",
        freezeAgeDays: 7,
      },
    ]);
    await db.insert(metricDefinitions).values([
      {
        workspaceId: workspaceA.id,
        externalId: "followers-a",
        name: "Follower count",
        kind: "raw",
        connectorKey: "x_account",
        connectionName: "X account",
        externalMetricKey: "followers_count",
        unit: "followers",
        aggregation: "latest",
        target: "6000",
        publicationStatus: "published",
      },
      {
        workspaceId: workspaceA.id,
        externalId: "draft-a",
        name: "Draft metric",
        kind: "raw",
        connectorKey: "x_account",
        connectionName: "X account",
        externalMetricKey: "draft",
        unit: "followers",
        aggregation: "latest",
        publicationStatus: "draft",
      },
      {
        workspaceId: workspaceB.id,
        externalId: "followers-b",
        name: "Other workspace followers",
        kind: "raw",
        connectorKey: "x_account",
        connectionName: "X account",
        externalMetricKey: "followers_count",
        unit: "followers",
        aggregation: "latest",
        publicationStatus: "published",
      },
    ]);

    const options = await listGrowthSeriesOptions(workspaceA.id);

    expect(options).toEqual([
      expect.objectContaining({
        externalId: "followers-a",
        name: "Follower count",
        target: "6000.0000000000",
      }),
    ]);
  });

  it("returns overlapping observations in chronological order with connection freeze policy", async () => {
    const workspace = await createWorkspace("Workspace A");
    const [connection] = await db
      .insert(connections)
      .values({
        workspaceId: workspace.id,
        connectorKey: "x_account",
        name: "X account",
        usagePeriodStart: "2026-08-01",
        freezeAgeDays: 30,
      })
      .returning({ id: connections.id });
    const [definition] = await db
      .insert(metricDefinitions)
      .values({
        workspaceId: workspace.id,
        externalId: "followers-a",
        name: "Follower count",
        kind: "raw",
        connectorKey: "x_account",
        connectionName: "X account",
        externalMetricKey: "followers_count",
        unit: "followers",
        aggregation: "latest",
        target: "6000",
        publicationStatus: "published",
      })
      .returning({ id: metricDefinitions.id });
    const [snapshot] = await db
      .insert(sourceSnapshots)
      .values({
        workspaceId: workspace.id,
        connectionId: connection!.id,
        externalObjectId: "account-a",
        operationKey: "followers",
        requestScopeJson: {},
        requestChecksum: "request-a",
        responseJson: {},
        checksum: "response-a",
        observedAt: new Date("2026-08-03T00:00:00Z"),
      })
      .returning({ id: sourceSnapshots.id });
    const inserted = await db
      .insert(metricObservations)
      .values([
        {
          workspaceId: workspace.id,
          metricDefinitionId: definition!.id,
          sourceSnapshotId: snapshot!.id,
          periodStart: new Date("2026-06-20T00:00:00Z"),
          periodEnd: new Date("2026-06-30T23:59:59Z"),
          value: "900",
          unit: "followers",
          freshness: "frozen",
          frozenAt: new Date("2026-07-30T00:00:00Z"),
          sourceUrl: "https://analytics.x.com/outside",
          observedAt: new Date("2026-07-30T00:00:00Z"),
        },
        {
          workspaceId: workspace.id,
          metricDefinitionId: definition!.id,
          sourceSnapshotId: snapshot!.id,
          periodStart: new Date("2026-07-15T00:00:00Z"),
          periodEnd: new Date("2026-07-21T23:59:59Z"),
          value: "1200",
          unit: "followers",
          freshness: "fresh",
          sourceUrl: "https://analytics.x.com/later",
          observedAt: new Date("2026-07-22T00:00:00Z"),
        },
        {
          workspaceId: workspace.id,
          metricDefinitionId: definition!.id,
          sourceSnapshotId: snapshot!.id,
          periodStart: new Date("2026-07-01T00:00:00Z"),
          periodEnd: new Date("2026-07-07T23:59:59Z"),
          value: "1000",
          unit: "followers",
          freshness: "fresh",
          sourceUrl: "https://analytics.x.com/earlier",
          observedAt: new Date("2026-07-08T00:00:00Z"),
        },
      ])
      .returning({ id: metricObservations.id });

    const series = await listGrowthSeries({
      workspaceId: workspace.id,
      metricDefinitionId: definition!.id,
      start: "2026-07-01",
      end: "2026-07-31",
    });

    expect(series?.freezeAgeDays).toBe(30);
    expect(series?.definition).toMatchObject({
      id: definition!.id,
      name: "Follower count",
      target: "6000.0000000000",
    });
    expect(series?.points.map((point) => point.id)).toEqual([
      inserted[2]!.id,
      inserted[1]!.id,
    ]);
    expect(series?.points.map((point) => point.sourceUrl)).toEqual([
      "https://analytics.x.com/earlier",
      "https://analytics.x.com/later",
    ]);
  });

  it("defaults the timeline to the first published connected growth metric", async () => {
    const workspace = await createWorkspace("Workspace A");
    await db.insert(connections).values({
      workspaceId: workspace.id,
      connectorKey: "x_account",
      name: "X account",
      usagePeriodStart: "2026-08-01",
      freezeAgeDays: 14,
    });
    const [definition] = await db
      .insert(metricDefinitions)
      .values({
        workspaceId: workspace.id,
        externalId: "followers-a",
        name: "Follower count",
        kind: "raw",
        connectorKey: "x_account",
        connectionName: "X account",
        externalMetricKey: "followers_count",
        unit: "followers",
        aggregation: "latest",
        publicationStatus: "published",
      })
      .returning({ id: metricDefinitions.id });

    const model = await getTimelineWindow({
      workspaceId: workspace.id,
      start: "2026-07-01",
      end: "2026-07-31",
      zoom: "quarter",
    });

    expect(model.growthOptions.map((option) => option.id)).toEqual([
      definition!.id,
    ]);
    expect(model.growthSeries).toMatchObject({
      definition: { id: definition!.id },
      freezeAgeDays: 14,
      points: [],
      latestValue: null,
    });
  });
});
