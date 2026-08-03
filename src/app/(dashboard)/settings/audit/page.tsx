import { desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { auditEvents } from "@/db/schema";
import { requireCurrentWorkspaceMember } from "@/lib/auth/access";

export default async function AuditPage() {
  const member = await requireCurrentWorkspaceMember();
  const events = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.workspaceId, member.workspaceId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(200);
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-4xl font-semibold tracking-tight">Audit history</h1>
      <div className="mt-8 space-y-3">
        {events.map((event) => (
          <article className="rounded-2xl border border-black/10 bg-white p-5" key={event.id}>
            <div className="flex items-center justify-between gap-4">
              <strong className="text-sm">{event.action}</strong>
              <time className="text-xs text-black/45">{event.createdAt.toLocaleString()}</time>
            </div>
            <p className="mt-2 text-xs text-black/55">{event.entityType} · {event.entityId ?? "workspace"}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
