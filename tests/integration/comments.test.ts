import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { memberships, notifications, users } from "@/db/schema";
import { createWorkspace } from "@/db/queries/workspaces";
import { createComment, listComments } from "@/lib/comments/service";
import { closeDatabasePool, resetDatabase } from "../helpers/database";

describe("comment collaboration", () => {
  beforeEach(resetDatabase);
  afterAll(closeDatabasePool);

  it("creates one reply level and notifies valid mentions except self", async () => {
    const workspace = await createWorkspace("Tessera Lab");
    const people = await db.insert(users).values([
      { email: "author@example.test", name: "Author" },
      { email: "member@example.test", name: "Member" },
      { email: "outsider@example.test", name: "Outsider" },
    ]).returning({ id: users.id });
    await db.insert(memberships).values(people.slice(0, 2).map((person) => ({
      workspaceId: workspace.id,
      userId: person.id,
      role: "member" as const,
    })));
    const entityId = crypto.randomUUID();
    const parent = await createComment({
      workspaceId: workspace.id,
      entityType: "initiative",
      entityId,
      authorUserId: people[0]!.id,
      body: `Review @[Member](user:${people[1]!.id}) and @[Author](user:${people[0]!.id})`,
    });
    await createComment({
      workspaceId: workspace.id,
      entityType: "initiative",
      entityId,
      authorUserId: people[1]!.id,
      parentCommentId: parent.id,
      body: "Reviewed.",
    });

    expect(await listComments(workspace.id, "initiative", entityId)).toHaveLength(1);
    const notices = await db.select().from(notifications).where(
      eq(notifications.workspaceId, workspace.id),
    );
    expect(notices).toHaveLength(1);
    expect(notices[0]?.userId).toBe(people[1]!.id);

    await expect(createComment({
      workspaceId: workspace.id,
      entityType: "initiative",
      entityId,
      authorUserId: people[0]!.id,
      body: `Hi @[Outsider](user:${people[2]!.id})`,
    })).rejects.toThrow("mentioned user is not a workspace member");
  });
});
