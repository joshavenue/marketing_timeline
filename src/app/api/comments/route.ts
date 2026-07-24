import { NextResponse } from "next/server";
import { z } from "zod";

import { createComment, listComments } from "@/lib/comments/service";
import { requireCurrentWorkspaceMember } from "@/lib/auth/access";

const entityType = z.enum(["initiative", "event"]);
const id = z.string().uuid();
const createSchema = z.object({
  entityType,
  entityId: id,
  parentCommentId: id.optional(),
  body: z.string().min(1).max(10_000),
});

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Invalid request";
  const status =
    message === "UNAUTHENTICATED"
      ? 401
      : message === "FORBIDDEN"
        ? 403
        : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const member = await requireCurrentWorkspaceMember();
    const url = new URL(request.url);
    const type = entityType.parse(url.searchParams.get("entityType"));
    const entityId = id.parse(url.searchParams.get("entityId"));
    return NextResponse.json({
      comments: await listComments(member.workspaceId, type, entityId),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const member = await requireCurrentWorkspaceMember();
    const input = createSchema.parse(await request.json());
    const comment = await createComment({
      ...input,
      workspaceId: member.workspaceId,
      authorUserId: member.userId,
    });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
