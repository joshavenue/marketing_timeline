import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { userPreferences } from "@/db/schema";
import { requireCurrentWorkspaceMember } from "@/lib/auth/access";

const viewportSchema = z.object({
  scrollLeft: z.number().finite().nonnegative(),
  zoom: z.enum(["year", "quarter", "month", "week"]),
});

export async function PUT(request: Request) {
  try {
    const member = await requireCurrentWorkspaceMember();
    const viewport = viewportSchema.parse(await request.json());
    await db
      .insert(userPreferences)
      .values({
        workspaceId: member.workspaceId,
        userId: member.userId,
        key: "timeline.viewport",
        valueJson: viewport,
      })
      .onConflictDoUpdate({
        target: [
          userPreferences.workspaceId,
          userPreferences.userId,
          userPreferences.key,
        ],
        set: { valueJson: viewport, updatedAt: new Date() },
      });
    return NextResponse.json({ saved: true });
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
