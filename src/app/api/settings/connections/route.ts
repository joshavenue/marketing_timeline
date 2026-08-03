import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { auditEvents, connections } from "@/db/schema";
import {
  requireCurrentWorkspaceMember,
  requireWorkspaceAdmin,
} from "@/lib/auth/access";
import { encryptSecret } from "@/lib/crypto/secrets";

const schema = z.object({
  connectorKey: z.enum(["notion", "x_post", "x_account", "x_ads"]),
  name: z.string().trim().min(1).max(120),
  credential: z.string().min(1).max(64_000),
  confirmed: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const current = await requireCurrentWorkspaceMember();
    const workspaceId = current.workspaceId;
    const admin = await requireWorkspaceAdmin(workspaceId);
    const body = schema.parse(await request.json());
    const [connection] = await db
      .insert(connections)
      .values({
        workspaceId,
        connectorKey: body.connectorKey,
        name: body.name,
        credentialsCiphertext: encryptSecret(body.credential),
        usagePeriodStart: new Date().toISOString().slice(0, 7) + "-01",
        health: "configured",
      })
      .returning({ id: connections.id, name: connections.name });
    await db.insert(auditEvents).values([
      {
        workspaceId,
        actorUserId: admin.userId,
        action: "connection.created",
        entityType: "connection",
        entityId: connection!.id,
        detailsJson: {
          connectorKey: body.connectorKey,
          name: body.name,
        },
      },
      {
        workspaceId,
        actorUserId: admin.userId,
        action: "connection.credential_rotated",
        entityType: "connection",
        entityId: connection!.id,
        detailsJson: { confirmed: true },
      },
    ]);
    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
