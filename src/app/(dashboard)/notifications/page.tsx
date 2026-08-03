import Link from "next/link";
import { redirect } from "next/navigation";

import { requireCurrentWorkspaceMember } from "@/lib/auth/access";
import { listNotifications } from "@/lib/notifications/service";

export default async function NotificationsPage() {
  let member;
  try {
    member = await requireCurrentWorkspaceMember();
  } catch {
    redirect("/login");
  }
  const notifications = await listNotifications(member.workspaceId, member.userId);
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
      <div className="mt-6 space-y-3">
        {notifications.length ? notifications.map((notification) => (
          <Link
            className="block rounded-2xl border border-black/10 bg-white p-5"
            href={`/${notification.entityType === "initiative" ? "initiatives" : "events"}/${notification.entityId}#comment-${notification.commentId}`}
            key={notification.id}
          >
            <p className="text-sm font-medium">You were mentioned in a comment.</p>
            <time className="mt-1 block text-xs text-black/45">
              {notification.createdAt.toLocaleString()}
            </time>
          </Link>
        )) : (
          <p className="rounded-2xl border border-dashed border-black/15 p-6 text-sm text-black/45">
            No notifications yet.
          </p>
        )}
      </div>
    </main>
  );
}
