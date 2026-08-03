import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import { getInitiativeDetail } from "@/db/queries/initiative-details";
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
import { createWorkspace } from "@/db/queries/workspaces";
import { closeDatabasePool, resetDatabase } from "../helpers/database";

describe("initiative detail evidence", () => {
  beforeEach(resetDatabase);
  afterAll(closeDatabasePool);

  it("groups effort contributors and returns source and freeze provenance", async () => {
    const workspace = await createWorkspace("Tessera Lab");
    const [connection] = await db
      .insert(connections)
      .values({
        workspaceId: workspace.id,
        connectorKey: "notion",
        name: "Marketing Notion",
        usagePeriodStart: "2026-08-01",
        freezeAgeDays: 30,
      })
      .returning({ id: connections.id });
    const [snapshot] = await db
      .insert(sourceSnapshots)
      .values({
        workspaceId: workspace.id,
        connectionId: connection!.id,
        externalObjectId: "initiative-a",
        operationKey: "query",
        requestScopeJson: {},
        requestChecksum: "request-a",
        responseJson: {},
        checksum: "response-a",
        observedAt: new Date("2026-08-03T00:00:00Z"),
      })
      .returning({ id: sourceSnapshots.id });
    const [campaign] = await db
      .insert(campaigns)
      .values({
        workspaceId: workspace.id,
        externalId: "campaign-a",
        name: "Growth 2026",
        lifecycleStatus: "Active",
        publicationStatus: "published",
        startDate: "2026-07-01",
        displayLevel: "primary",
      })
      .returning({ id: campaigns.id });
    const [initiative] = await db
      .insert(initiatives)
      .values({
        workspaceId: workspace.id,
        externalId: "initiative-a",
        campaignId: campaign!.id,
        name: "Creator partnership rollout",
        lifecycleStatus: "Active",
        publicationStatus: "published",
        startDate: "2026-07-06",
        endDate: "2026-08-31",
        displayLevel: "primary",
        currentSnapshotId: snapshot!.id,
        sourceUrlsJson: ["https://notion.so/initiative-a"],
      })
      .returning({ id: initiatives.id });
    await db.insert(initiativeVersions).values({
      workspaceId: workspace.id,
      initiativeId: initiative!.id,
      version: 1,
      recordJson: { name: "Creator partnership rollout" },
      sourceSnapshotId: snapshot!.id,
    });
    const [event] = await db
      .insert(timelineEvents)
      .values({
        workspaceId: workspace.id,
        externalId: "event-a",
        initiativeId: initiative!.id,
        title: "Creation of marketing collateral",
        kind: "activity",
        publicationStatus: "published",
        startDate: "2026-07-08",
        displayLevel: "nested",
        sourceUrlsJson: ["https://notion.so/event-a"],
      })
      .returning({ id: timelineEvents.id });
    await db.insert(timelineEventContributors).values([
      {
        workspaceId: workspace.id,
        eventId: event!.id,
        contributorName: "Person B",
      },
      {
        workspaceId: workspace.id,
        eventId: event!.id,
        contributorName: "Person A",
      },
    ]);
    const [definition] = await db
      .insert(metricDefinitions)
      .values({
        workspaceId: workspace.id,
        externalId: "followers",
        name: "Follower count",
        kind: "raw",
        connectorKey: "notion",
        connectionName: "Marketing Notion",
        externalMetricKey: "followers",
        unit: "followers",
        aggregation: "latest",
        publicationStatus: "published",
      })
      .returning({ id: metricDefinitions.id });
    await db.insert(initiativeMetrics).values({
      workspaceId: workspace.id,
      initiativeId: initiative!.id,
      metricDefinitionId: definition!.id,
    });
    await db.insert(metricObservations).values({
      workspaceId: workspace.id,
      metricDefinitionId: definition!.id,
      initiativeId: initiative!.id,
      sourceSnapshotId: snapshot!.id,
      periodStart: new Date("2026-07-01T00:00:00Z"),
      periodEnd: new Date("2026-07-31T23:59:59Z"),
      value: "5842",
      unit: "followers",
      freshness: "fresh",
      sourceUrl: "https://notion.so/weekly-analytics",
      observedAt: new Date("2026-08-03T00:00:00Z"),
    });

    const detail = await getInitiativeDetail(workspace.id, initiative!.id);

    expect(detail?.contributions).toEqual([
      {
        eventId: event!.id,
        title: "Creation of marketing collateral",
        contributors: ["Person A", "Person B"],
        sourceUrls: ["https://notion.so/event-a"],
      },
    ]);
    expect(detail?.sourceSnapshot).toMatchObject({
      id: snapshot!.id,
      connectionName: "Marketing Notion",
      externalObjectId: "initiative-a",
      observedAt: new Date("2026-08-03T00:00:00Z"),
    });
    expect(detail?.metrics[0]).toMatchObject({
      name: "Follower count",
      value: "5842.0000000000",
      freshness: "fresh",
      freezeAgeDays: 30,
      sourceUrl: "https://notion.so/weekly-analytics",
    });
    expect(detail?.versions[0]).toMatchObject({
      version: 1,
      sourceSnapshotId: snapshot!.id,
    });
  });
});
