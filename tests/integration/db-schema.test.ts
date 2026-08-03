import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import {
  campaigns,
  initiatives,
  timelineEventContributors,
  timelineEvents,
} from "@/db/schema";
import { createWorkspace } from "@/db/queries/workspaces";
import { listTimelineRows } from "@/db/queries/timeline";
import {
  closeDatabasePool,
  resetDatabase,
} from "../helpers/database";

describe("workspace-scoped timeline schema", () => {
  beforeEach(resetDatabase);
  afterAll(closeDatabasePool);

  it("returns only rows belonging to the requested workspace", async () => {
    const workspaceA = await createWorkspace("Workspace A");
    const workspaceB = await createWorkspace("Workspace B");

    await db.insert(initiatives).values([
      {
        workspaceId: workspaceA.id,
        externalId: "initiative-a",
        name: "Initiative A",
        lifecycleStatus: "Complete",
        publicationStatus: "published",
        startDate: "2026-01-10",
        displayLevel: "primary",
      },
      {
        workspaceId: workspaceB.id,
        externalId: "initiative-b",
        name: "Initiative B",
        lifecycleStatus: "Complete",
        publicationStatus: "published",
        startDate: "2026-01-11",
        displayLevel: "primary",
      },
    ]);

    const rows = await listTimelineRows(workspaceA.id, {
      start: "2026-01-01",
      end: "2026-01-31",
    });

    expect(rows.map((row) => row.externalId)).toEqual(["initiative-a"]);
  });

  it("preserves campaign, initiative, and event hierarchy metadata", async () => {
    const workspace = await createWorkspace("Workspace A");
    const [campaign] = await db
      .insert(campaigns)
      .values({
        workspaceId: workspace.id,
        externalId: "campaign-a",
        name: "Campaign A",
        lifecycleStatus: "Active",
        publicationStatus: "published",
        startDate: "2026-01-01",
        displayLevel: "primary",
      })
      .returning({ id: campaigns.id });
    const [initiative] = await db
      .insert(initiatives)
      .values({
        workspaceId: workspace.id,
        externalId: "initiative-a",
        campaignId: campaign!.id,
        name: "Initiative A",
        lifecycleStatus: "Active",
        publicationStatus: "published",
        startDate: "2026-01-10",
        displayLevel: "primary",
      })
      .returning({ id: initiatives.id });
    const [event] = await db
      .insert(timelineEvents)
      .values({
        workspaceId: workspace.id,
        externalId: "event-a",
        initiativeId: initiative!.id,
        title: "Event A",
        kind: "activity",
        publicationStatus: "published",
        startDate: "2026-01-11",
        displayLevel: "nested",
      })
      .returning({ id: timelineEvents.id });
    await db.insert(timelineEventContributors).values({
      workspaceId: workspace.id,
      eventId: event!.id,
      contributorName: "Person A",
    });

    const rows = await listTimelineRows(workspace.id, {
      start: "2026-01-01",
      end: "2026-01-31",
    });

    expect(
      rows.map(({ kind, parentId, contributors }) => ({
        kind,
        parentId,
        contributors,
      })),
    ).toEqual([
      { kind: "campaign", parentId: null, contributors: [] },
      { kind: "initiative", parentId: campaign!.id, contributors: [] },
      {
        kind: "activity",
        parentId: initiative!.id,
        contributors: ["Person A"],
      },
    ]);
  });

  it("rejects duplicate external IDs inside one workspace", async () => {
    const workspace = await createWorkspace("Workspace A");
    const record = {
      workspaceId: workspace.id,
      externalId: "initiative-a",
      name: "Initiative A",
      lifecycleStatus: "Complete",
      publicationStatus: "published" as const,
      startDate: "2026-01-10",
      displayLevel: "primary" as const,
    };

    await db.insert(initiatives).values(record);

    await expect(db.insert(initiatives).values(record)).rejects.toThrow();
  });
});
