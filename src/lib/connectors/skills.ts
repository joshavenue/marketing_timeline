import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { auditEvents, connectorSkills } from "@/db/schema";

const MAX_SKILL_BYTES = 256 * 1024;
const manifestBlock =
  /^```connector-manifest[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm;

const connectorManifestSchema = z
  .object({
    apiFamily: z.string().trim().min(1),
    version: z.number().int().positive(),
    operations: z
      .array(
        z
          .object({
            key: z.string().trim().min(1),
            method: z.literal("GET"),
            host: z.string().trim().min(1),
            path: z.string().startsWith("/"),
            allowedQueryParameters: z.array(z.string().trim().min(1)),
            allowedResponseFields: z.array(z.string().trim().min(1)),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type ConnectorManifest = z.infer<typeof connectorManifestSchema>;

export function parseConnectorManifest(markdown: string): ConnectorManifest {
  if (Buffer.byteLength(markdown, "utf8") > MAX_SKILL_BYTES) {
    throw new Error("Connector skill exceeds 256 KiB");
  }

  const blocks = [...markdown.matchAll(manifestBlock)];
  if (blocks.length !== 1) {
    throw new Error(
      "Connector skill must contain exactly one connector-manifest block",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(blocks[0]![1]!);
  } catch {
    throw new Error("connector-manifest must contain valid JSON");
  }

  return connectorManifestSchema.parse(parsed);
}

export interface ActivateSkillInput {
  workspaceId: string;
  apiFamily: string;
  version: number;
  markdown: string;
  createdBy: string;
}

export async function activateSkillVersion(input: ActivateSkillInput) {
  const manifest = parseConnectorManifest(input.markdown);
  if (
    manifest.apiFamily !== input.apiFamily ||
    manifest.version !== input.version
  ) {
    throw new Error("Skill manifest identity does not match activation input");
  }

  const checksum = createHash("sha256")
    .update(input.markdown)
    .digest("hex");

  await db.transaction(async (transaction) => {
    await transaction
      .update(connectorSkills)
      .set({ active: false })
      .where(
        and(
          eq(connectorSkills.workspaceId, input.workspaceId),
          eq(connectorSkills.apiFamily, input.apiFamily),
          eq(connectorSkills.active, true),
        ),
      );

    const [skill] = await transaction
      .insert(connectorSkills)
      .values({
        workspaceId: input.workspaceId,
        apiFamily: input.apiFamily,
        version: input.version,
        markdown: input.markdown,
        checksum,
        active: true,
        createdBy: input.createdBy,
      })
      .returning({ id: connectorSkills.id });

    await transaction.insert(auditEvents).values({
      workspaceId: input.workspaceId,
      actorUserId: input.createdBy,
      action: "connector_skill.activated",
      entityType: "connector_skill",
      entityId: skill!.id,
      detailsJson: {
        apiFamily: input.apiFamily,
        version: input.version,
        checksum,
      },
    });
  });
}
