import { createHash } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { memberships, users } from "@/db/schema";
import {
  acceptInvitation,
  createInvitation,
} from "@/lib/auth/invitations";
import { createWorkspace } from "@/db/queries/workspaces";
import {
  closeDatabasePool,
  resetDatabase,
} from "../helpers/database";

describe("workspace invitations", () => {
  beforeEach(resetDatabase);
  afterAll(closeDatabasePool);

  it("stores only a hash and rejects a different Google email", async () => {
    const workspace = await createWorkspace("Tessera Lab");
    const [inviter] = await db
      .insert(users)
      .values({ email: "admin@example.test" })
      .returning({ id: users.id });

    const { token } = await createInvitation({
      workspaceId: workspace.id,
      email: "member@example.test",
      role: "member",
      invitedBy: inviter!.id,
    });

    expect(token).toHaveLength(43);
    expect(createHash("sha256").update(token).digest("hex")).toHaveLength(64);
    await expect(
      acceptInvitation(token, "other@example.com"),
    ).rejects.toThrow("Invitation email does not match");
  });

  it("accepts a matching email once and creates an active membership", async () => {
    const workspace = await createWorkspace("Tessera Lab");
    const [inviter] = await db
      .insert(users)
      .values({ email: "admin@example.test" })
      .returning({ id: users.id });

    const { token } = await createInvitation({
      workspaceId: workspace.id,
      email: "Member@Example.Test",
      role: "member",
      invitedBy: inviter!.id,
    });

    await acceptInvitation(token, "member@example.test");

    const [member] = await db
      .select()
      .from(users)
      .where(eq(users.email, "member@example.test"));
    const [membership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, member!.id));

    expect(membership).toMatchObject({
      workspaceId: workspace.id,
      role: "member",
      active: true,
    });
    await expect(
      acceptInvitation(token, "member@example.test"),
    ).rejects.toThrow("Invitation is no longer valid");
  });
});
