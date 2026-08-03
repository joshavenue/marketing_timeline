import { NextResponse } from "next/server";
import { z } from "zod";

import { requireWorkspaceAdmin } from "@/lib/auth/access";
import { activateSkillVersion, parseConnectorManifest } from "@/lib/connectors/skills";

const schema = z.object({
  workspaceId: z.string().uuid(),
  apiFamily: z.string().trim().min(1),
  version: z.number().int().positive(),
  markdown: z.string().min(1).max(256 * 1024),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const admin = await requireWorkspaceAdmin(input.workspaceId);
    const manifest = parseConnectorManifest(input.markdown);
    await activateSkillVersion({ ...input, createdBy: admin.userId });
    return NextResponse.json({
      activated: true,
      version: input.version,
      manifest,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json(
      { error: message },
      { status: message === "FORBIDDEN" ? 403 : 400 },
    );
  }
}
