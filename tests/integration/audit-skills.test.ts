import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { auditEvents, connectorSkills, users } from "@/db/schema";
import { createWorkspace } from "@/db/queries/workspaces";
import {
  activateSkillVersion,
  parseConnectorManifest,
} from "@/lib/connectors/skills";
import {
  closeDatabasePool,
  resetDatabase,
} from "../helpers/database";

function skillMarkdown(version: number) {
  return `# X API

\`\`\`connector-manifest
{
  "apiFamily": "x",
  "version": ${version},
  "operations": [{
    "key": "x.post.metrics",
    "method": "GET",
    "host": "api.x.com",
    "path": "/2/tweets",
    "allowedQueryParameters": ["ids", "tweet.fields"],
    "allowedResponseFields": ["data.id", "data.public_metrics"]
  }]
}
\`\`\`

Use the owned-post metrics operation only for configured post IDs.`;
}

describe("connector skill versions", () => {
  beforeEach(resetDatabase);
  afterAll(closeDatabasePool);

  it("requires exactly one connector-manifest block", () => {
    expect(() => parseConnectorManifest("# no manifest")).toThrow(
      "exactly one connector-manifest",
    );
    const duplicated = `${skillMarkdown(1)}\n${skillMarkdown(1)}`;
    expect(() => parseConnectorManifest(duplicated)).toThrow(
      "exactly one connector-manifest",
    );
  });

  it("activates a new version while retaining history and auditing once", async () => {
    const workspace = await createWorkspace("Tessera Lab");
    const [user] = await db
      .insert(users)
      .values({ email: "admin@example.test" })
      .returning({ id: users.id });

    await activateSkillVersion({
      workspaceId: workspace.id,
      apiFamily: "x",
      version: 1,
      markdown: skillMarkdown(1),
      createdBy: user!.id,
    });
    await activateSkillVersion({
      workspaceId: workspace.id,
      apiFamily: "x",
      version: 2,
      markdown: skillMarkdown(2),
      createdBy: user!.id,
    });

    const rows = await db
      .select()
      .from(connectorSkills)
      .where(
        and(
          eq(connectorSkills.workspaceId, workspace.id),
          eq(connectorSkills.apiFamily, "x"),
        ),
      );
    const audits = await db
      .select()
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.workspaceId, workspace.id),
          eq(auditEvents.action, "connector_skill.activated"),
          eq(auditEvents.entityId, rows.find((row) => row.version === 2)!.id),
        ),
      );

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.version === 1)?.active).toBe(false);
    expect(rows.find((row) => row.version === 2)?.active).toBe(true);
    expect(audits).toHaveLength(1);
  });
});
