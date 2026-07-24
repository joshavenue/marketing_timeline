import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import { connections, memberships, refreshJobItems, users } from "@/db/schema";
import { createWorkspace } from "@/db/queries/workspaces";
import { createApprovedRefreshJob } from "@/lib/refresh/jobs";
import { claimQueuedItem } from "@/lib/refresh/worker";
import { closeDatabasePool, resetDatabase } from "../helpers/database";

describe("guarded refresh jobs", () => {
  beforeEach(resetDatabase);
  afterAll(closeDatabasePool);

  it("rejects members and never queues frozen objects", async () => {
    const workspace = await createWorkspace("Tessera Lab");
    const people = await db.insert(users).values([
      { email: "admin@example.test" },
      { email: "member@example.test" },
    ]).returning({ id: users.id });
    await db.insert(memberships).values([
      { workspaceId: workspace.id, userId: people[0]!.id, role: "admin" },
      { workspaceId: workspace.id, userId: people[1]!.id, role: "member" },
    ]);
    const [connection] = await db.insert(connections).values({
      workspaceId: workspace.id,
      connectorKey: "x_post",
      name: "X posts",
      usagePeriodStart: "2026-07-01",
      costPerOperationMicros: "10",
      hardCapMicros: "100",
      periodUsageMicros: "0",
      freezeAgeDays: 7,
    }).returning();
    const request = {
      workspaceId: workspace.id,
      connectionId: connection!.id,
      objects: [
        { externalObjectId: "eligible" },
        {
          externalObjectId: "frozen",
          observedAt: new Date("2026-07-01T00:00:00Z"),
        },
      ],
      now: new Date("2026-07-24T00:00:00Z"),
    };

    await expect(createApprovedRefreshJob({
      ...request,
      requestedBy: people[1]!.id,
    })).rejects.toThrow("Admin permission is required");
    await createApprovedRefreshJob({
      ...request,
      requestedBy: people[0]!.id,
    });
    const items = await db.select().from(refreshJobItems);
    expect(items.map((item) => item.externalObjectId)).toEqual(["eligible"]);
    const claims = await Promise.all([claimQueuedItem(), claimQueuedItem()]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(claims.find(Boolean)?.externalObjectId).toBe("eligible");
  });
});
