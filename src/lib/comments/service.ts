import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { comments, memberships, users } from "@/db/schema";
import { createMentionNotification } from "@/lib/notifications/service";

const mentionPattern = /@\[([^\]]+)\]\(user:([0-9a-f-]{36})\)/gi;

export interface CreateCommentInput {
  workspaceId: string;
  entityType: "initiative" | "event";
  entityId: string;
  authorUserId: string;
  body: string;
  parentCommentId?: string;
}

export interface CommentView {
  id: string;
  body: string;
  authorUserId: string;
  authorName: string;
  createdAt: Date;
  replies: CommentView[];
}

function mentionedUserIds(body: string) {
  return [...body.matchAll(mentionPattern)].map((match) => match[2]!);
}

export async function createComment(input: CreateCommentInput) {
  const body = input.body.trim();
  if (!body) throw new Error("comment body is required");
  if (body.length > 10_000) throw new Error("comment body exceeds 10000 characters");

  const memberIds = [...new Set([input.authorUserId, ...mentionedUserIds(body)])];
  const validMembers = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(
      and(
        eq(memberships.workspaceId, input.workspaceId),
        eq(memberships.active, true),
        inArray(memberships.userId, memberIds),
      ),
    );
  const validIds = new Set(validMembers.map((member) => member.userId));
  if (!validIds.has(input.authorUserId)) throw new Error("author is not a workspace member");
  for (const mentionedId of mentionedUserIds(body)) {
    if (!validIds.has(mentionedId)) {
      throw new Error("mentioned user is not a workspace member");
    }
  }

  if (input.parentCommentId) {
    const [parent] = await db
      .select({ id: comments.id, parentId: comments.parentCommentId })
      .from(comments)
      .where(
        and(
          eq(comments.id, input.parentCommentId),
          eq(comments.workspaceId, input.workspaceId),
          eq(comments.entityType, input.entityType),
          eq(comments.entityId, input.entityId),
        ),
      )
      .limit(1);
    if (!parent) throw new Error("parent comment not found");
    if (parent.parentId) throw new Error("replies may only be one level deep");
  }

  const [comment] = await db
    .insert(comments)
    .values({
      workspaceId: input.workspaceId,
      entityType: input.entityType,
      entityId: input.entityId,
      authorUserId: input.authorUserId,
      parentCommentId: input.parentCommentId,
      body,
    })
    .returning();
  for (const userId of new Set(mentionedUserIds(body))) {
    if (userId !== input.authorUserId) {
      await createMentionNotification({
        workspaceId: input.workspaceId,
        userId,
        entityType: input.entityType,
        entityId: input.entityId,
        commentId: comment!.id,
      });
    }
  }
  return comment!;
}

export async function listComments(
  workspaceId: string,
  entityType: "initiative" | "event",
  entityId: string,
): Promise<CommentView[]> {
  const rows = await db
    .select({
      id: comments.id,
      parentCommentId: comments.parentCommentId,
      body: comments.body,
      authorUserId: comments.authorUserId,
      authorName: users.name,
      authorEmail: users.email,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorUserId))
    .where(
      and(
        eq(comments.workspaceId, workspaceId),
        eq(comments.entityType, entityType),
        eq(comments.entityId, entityId),
      ),
    )
    .orderBy(asc(comments.createdAt), asc(comments.id));
  const views = new Map<string, CommentView>();
  for (const row of rows) {
    views.set(row.id, {
      id: row.id,
      body: row.body,
      authorUserId: row.authorUserId,
      authorName: row.authorName ?? row.authorEmail,
      createdAt: row.createdAt,
      replies: [],
    });
  }
  const roots: CommentView[] = [];
  for (const row of rows) {
    const view = views.get(row.id)!;
    if (row.parentCommentId) views.get(row.parentCommentId)?.replies.push(view);
    else roots.push(view);
  }
  return roots;
}
