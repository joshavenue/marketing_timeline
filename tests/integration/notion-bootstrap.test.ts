import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  auditEvents,
  connections,
  memberships,
  users,
  workspaces,
} from "@/db/schema";
import { decryptSecret } from "@/lib/crypto/secrets";
import { bootstrapNotionConnection } from "@/lib/notion/bootstrap";
import { closeDatabasePool, resetDatabase } from "../helpers/database";

const env = {
  NOTION_TOKEN: "notion-test-token",
  NOTION_CONNECTION_NAME: "Marketing HQ",
  NOTION_CAMPAIGNS_DATABASE_ID: "campaigns-db",
  NOTION_INITIATIVES_DATABASE_ID: "initiatives-db",
  NOTION_EVENTS_DATABASE_ID: "events-db",
  NOTION_METRICS_DATABASE_ID: "metrics-db",
  NOTION_OBSERVATIONS_DATABASE_ID: "observations-db",
};

describe("Notion connection bootstrap", () => {
  beforeEach(async () => {
    await resetDatabase();
    const [workspace] = await db
      .insert(workspaces)
      .values({ name: "Marketing Timeline" })
      .returning({ id: workspaces.id });
    const [user] = await db
      .insert(users)
      .values({ email: "admin@example.test" })
      .returning({ id: users.id });
    await db.insert(memberships).values({
      workspaceId: workspace!.id,
      userId: user!.id,
      role: "admin",
      active: true,
    });
  });
  afterAll(closeDatabasePool);

  it("creates one encrypted, idempotently replaceable connection", async () => {
    const first = await bootstrapNotionConnection(env);
    const second = await bootstrapNotionConnection({
      ...env,
      NOTION_TOKEN: "rotated-token",
    });

    expect(second).toMatchObject({
      connectionName: "Marketing HQ",
      replaced: true,
    });

    const rows = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.id, first.connectionId),
          eq(connections.connectorKey, "notion"),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(decryptSecret(rows[0]!.credentialsCiphertext!)).toBe(
      "rotated-token",
    );
    expect(rows[0]!.configJson).toEqual({
      databaseIds: {
        campaigns: "campaigns-db",
        initiatives: "initiatives-db",
        events: "events-db",
        metrics: "metrics-db",
        observations: "observations-db",
      },
    });

    const audits = await db
      .select({ action: auditEvents.action })
      .from(auditEvents)
      .where(eq(auditEvents.entityId, first.connectionId));
    expect(audits.map((audit) => audit.action)).toEqual([
      "connection.created",
      "connection.credential_rotated",
    ]);
  });
});
