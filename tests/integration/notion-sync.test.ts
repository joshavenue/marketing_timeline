import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";

import changedFixture from "@/../fixtures/notion/changed-record.json";
import validFixture from "@/../fixtures/notion/published-valid.json";
import { db } from "@/db/client";
import {
  connections,
  initiativeVersions,
  initiatives,
  users,
} from "@/db/schema";
import { createWorkspace } from "@/db/queries/workspaces";
import { encryptSecret } from "@/lib/crypto/secrets";
import { syncNotionWorkspace } from "@/lib/notion/sync";
import {
  closeDatabasePool,
  resetDatabase,
} from "../helpers/database";

const notionSource = vi.hoisted(() => ({ pages: [] as unknown[] }));

vi.mock("@/lib/notion/client", () => ({
  readCanonicalNotionPages: vi.fn(async () => notionSource.pages),
}));

const campaign = {
  recordType: "campaign",
  sourceId: "campaign001",
  sourceUrl: "https://www.notion.so/campaign001",
  name: "Token Sales",
  lifecycleStatus: "In progress",
  publicationStatus: "Published",
  startDate: "2026-07-01",
  endDate: "2026-07-31",
  ownerName: "Person A",
  objective: "Launch the token sale.",
  displayLevel: "Primary marker",
  sourceRecordUrls: ["https://www.notion.so/campaign-source"],
};

describe("snapshot-first Notion sync", () => {
  beforeEach(async () => {
    await resetDatabase();
    notionSource.pages = [];
  });
  afterAll(closeDatabasePool);

  it("imports, remains idempotent, versions changes, and archives deletions", async () => {
    const workspace = await createWorkspace("Tessera Lab");
    const [admin] = await db
      .insert(users)
      .values({ email: "admin@example.test" })
      .returning({ id: users.id });
    const [connection] = await db
      .insert(connections)
      .values({
        workspaceId: workspace.id,
        connectorKey: "notion",
        name: "Marketing HQ",
        credentialsCiphertext: encryptSecret("notion-test-token"),
        configJson: {
          databaseIds: {
            campaigns: "campaigns-db",
            initiatives: "initiatives-db",
            events: "events-db",
            metrics: "metrics-db",
            observations: "observations-db",
          },
        },
        usagePeriodStart: "2026-07-01",
      })
      .returning({ id: connections.id });

    notionSource.pages = [campaign, validFixture];
    const first = await syncNotionWorkspace({
      workspaceId: workspace.id,
      connectionId: connection!.id,
      actorUserId: admin!.id,
    });
    const second = await syncNotionWorkspace({
      workspaceId: workspace.id,
      connectionId: connection!.id,
      actorUserId: admin!.id,
    });

    expect(first.created).toEqual(["campaign:campaign001", "initiative:init001"]);
    expect(second.unchanged).toEqual([
      "campaign:campaign001",
      "initiative:init001",
    ]);

    notionSource.pages = [campaign, changedFixture];
    const changed = await syncNotionWorkspace({
      workspaceId: workspace.id,
      connectionId: connection!.id,
      actorUserId: admin!.id,
    });
    expect(changed.updated).toEqual(["initiative:init001"]);

    const versions = await db
      .select()
      .from(initiativeVersions)
      .innerJoin(
        initiatives,
        eq(initiatives.id, initiativeVersions.initiativeId),
      )
      .where(
        and(
          eq(initiatives.workspaceId, workspace.id),
          eq(initiatives.externalId, "init001"),
        ),
      );
    expect(versions).toHaveLength(2);

    notionSource.pages = [campaign];
    const removed = await syncNotionWorkspace({
      workspaceId: workspace.id,
      connectionId: connection!.id,
      actorUserId: admin!.id,
    });
    const [archived] = await db
      .select()
      .from(initiatives)
      .where(
        and(
          eq(initiatives.workspaceId, workspace.id),
          eq(initiatives.externalId, "init001"),
        ),
      );

    expect(removed.archived).toEqual(["initiative:init001"]);
    expect(archived?.sourceState).toBe("deleted");
  });
});
