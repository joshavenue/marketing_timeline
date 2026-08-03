import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { refreshJobItems, refreshJobs } from "@/db/schema";
import { requireCurrentWorkspaceMember } from "@/lib/auth/access";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const member = await requireCurrentWorkspaceMember();
    const { jobId } = await context.params;
    const [job, items] = await Promise.all([
      db
        .select()
        .from(refreshJobs)
        .where(
          and(
            eq(refreshJobs.id, jobId),
            eq(refreshJobs.workspaceId, member.workspaceId),
          ),
        )
        .limit(1),
      db
        .select()
        .from(refreshJobItems)
        .where(
          and(
            eq(refreshJobItems.jobId, jobId),
            eq(refreshJobItems.workspaceId, member.workspaceId),
          ),
        ),
    ]);
    if (!job[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ job: job[0], items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
