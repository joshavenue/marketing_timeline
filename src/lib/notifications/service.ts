import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { notifications } from "@/db/schema";

export async function createMentionNotification(input: {
  workspaceId: string;
  userId: string;
  entityType: "initiative" | "event";
  entityId: string;
  commentId: string;
}) {
  const [notification] = await db
    .insert(notifications)
    .values({ ...input, type: "mention" })
    .returning();
  return notification!;
}

export async function listNotifications(workspaceId: string, userId: string) {
  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.workspaceId, workspaceId),
        eq(notifications.userId, userId),
      ),
    )
    .orderBy(desc(notifications.createdAt));
}
