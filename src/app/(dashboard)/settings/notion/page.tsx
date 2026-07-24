import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { RefreshPreflight } from "@/components/settings/RefreshPreflight";
import { db } from "@/db/client";
import { connections } from "@/db/schema";
import { requireCurrentWorkspaceMember } from "@/lib/auth/access";

const databaseNames = [
  "Campaigns",
  "Initiatives",
  "Timeline Events & Contributions",
  "Metric Definitions",
  "Manual Metric Observations",
];

export default async function NotionSettingsPage() {
  let member;
  try {
    member = await requireCurrentWorkspaceMember();
  } catch {
    redirect("/login");
  }
  const notionConnections = await db
    .select({ id: connections.id, name: connections.name })
    .from(connections)
    .where(
      and(
        eq(connections.workspaceId, member.workspaceId),
        eq(connections.connectorKey, "notion"),
      ),
    );
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-blue-700">Data source</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            Canonical Notion history
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/60">
            Notion remains the editable source of truth. Synchronization is
            manual, read-only, snapshot-first, and limited to Published records.
          </p>
        </div>
        <Link
          className="rounded-full border border-black/15 bg-white px-5 py-3 text-sm font-medium"
          href="https://github.com/joshavenue/marketing_timeline/blob/agent/first-build/docs/runbooks/notion-canonical-setup.md"
        >
          View setup contract
        </Link>
      </div>

      <section className="mt-10 rounded-3xl border border-black/10 bg-white p-6">
        <h2 className="text-lg font-semibold">Required databases</h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2">
          {databaseNames.map((name, index) => (
            <li
              className="flex items-center gap-3 rounded-2xl bg-black/[0.035] p-4 text-sm"
              key={name}
            >
              <span className="grid size-7 place-items-center rounded-full bg-black text-xs text-white">
                {index + 1}
              </span>
              {name}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6 rounded-3xl border border-black/10 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Validation report</h2>
            <p className="mt-1 text-sm text-black/55">
              Invalid Published records are excluded and include corrective
              property guidance after each manual sync.
            </p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            Awaiting connection
          </span>
        </div>
      </section>
      <RefreshPreflight
        connections={notionConnections}
        isAdmin={member.role === "admin"}
      />
    </main>
  );
}
