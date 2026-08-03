import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCurrentWorkspaceMember } from "@/lib/auth/access";
import { createApprovedRefreshJob } from "@/lib/refresh/jobs";

const requestSchema = z.object({
  connectionId: z.string().uuid(),
  objects: z.array(
    z.object({
      externalObjectId: z.string().min(1),
      operationKey: z.string().optional(),
      observedAt: z.coerce.date().nullish(),
      periodStart: z.coerce.date().nullish(),
      periodEnd: z.coerce.date().nullish(),
    }),
  ).min(1),
});

export async function POST(request: Request) {
  try {
    const member = await requireCurrentWorkspaceMember();
    const input = requestSchema.parse(await request.json());
    const result = await createApprovedRefreshJob({
      workspaceId: member.workspaceId,
      requestedBy: member.userId,
      ...input,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message.includes("Admin")
          ? 403
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
