import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { auditEvents, connections, memberships } from "@/db/schema";
import { encryptSecret } from "@/lib/crypto/secrets";

export interface NotionBootstrapConfig {
  connectionName: string;
  token: string;
  databaseIds: {
    campaigns: string;
    initiatives: string;
    events: string;
    metrics: string;
    observations: string;
  };
}

type Environment = Readonly<Record<string, string | undefined>>;

function requiredEnv(env: Environment, key: string) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

export function readNotionBootstrapConfig(
  env: Environment = process.env,
): NotionBootstrapConfig {
  return {
    connectionName: env.NOTION_CONNECTION_NAME?.trim() || "Marketing HQ",
    token: requiredEnv(env, "NOTION_TOKEN"),
    databaseIds: {
      campaigns: requiredEnv(env, "NOTION_CAMPAIGNS_DATABASE_ID"),
      initiatives: requiredEnv(env, "NOTION_INITIATIVES_DATABASE_ID"),
      events: requiredEnv(env, "NOTION_EVENTS_DATABASE_ID"),
      metrics: requiredEnv(env, "NOTION_METRICS_DATABASE_ID"),
      observations: requiredEnv(env, "NOTION_OBSERVATIONS_DATABASE_ID"),
    },
  };
}

export async function bootstrapNotionConnection(
  env: Environment = process.env,
) {
  const config = readNotionBootstrapConfig(env);
  const [admin] = await db
    .select({ workspaceId: memberships.workspaceId, userId: memberships.userId })
    .from(memberships)
    .where(
      and(eq(memberships.role, "admin"), eq(memberships.active, true)),
    )
    .limit(1);

  if (!admin) throw new Error("An active workspace admin is required");

  const credentialsCiphertext = encryptSecret(config.token);

  const [existing] = await db
    .select({ id: connections.id })
    .from(connections)
    .where(
      and(
        eq(connections.workspaceId, admin.workspaceId),
        eq(connections.connectorKey, "notion"),
        eq(connections.name, config.connectionName),
      ),
    )
    .limit(1);

  const [connection] = await db
    .insert(connections)
    .values({
      workspaceId: admin.workspaceId,
      connectorKey: "notion",
      name: config.connectionName,
      credentialsCiphertext,
      configJson: { databaseIds: config.databaseIds },
      usagePeriodStart: new Date().toISOString().slice(0, 7) + "-01",
      health: "configured",
    })
    .onConflictDoUpdate({
      target: [
        connections.workspaceId,
        connections.connectorKey,
        connections.name,
      ],
      set: {
        credentialsCiphertext,
        configJson: { databaseIds: config.databaseIds },
        health: "configured",
        lastErrorCode: null,
        lastErrorMessage: null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: connections.id });

  await db.insert(auditEvents).values({
    workspaceId: admin.workspaceId,
    actorUserId: admin.userId,
    action: existing ? "connection.credential_rotated" : "connection.created",
    entityType: "connection",
    entityId: connection!.id,
    detailsJson: {
      connectorKey: "notion",
      name: config.connectionName,
      databaseCount: Object.keys(config.databaseIds).length,
    },
  });

  return {
    connectionId: connection!.id,
    workspaceId: admin.workspaceId,
    connectionName: config.connectionName,
    replaced: Boolean(existing),
    databaseCount: Object.keys(config.databaseIds).length,
  };
}
