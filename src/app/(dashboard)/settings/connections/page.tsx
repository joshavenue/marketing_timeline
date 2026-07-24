import { and, desc, eq } from "drizzle-orm";

import { ConnectionForm } from "@/components/settings/ConnectionForm";
import { SkillVersionForm } from "@/components/settings/SkillVersionForm";
import { SpendingCapForm } from "@/components/settings/SpendingCapForm";
import { db } from "@/db/client";
import { connections, connectorSkills } from "@/db/schema";
import { requireCurrentWorkspaceMember } from "@/lib/auth/access";

export default async function ConnectionsPage() {
  const member = await requireCurrentWorkspaceMember();
  const [connectionRows, activeSkills] = await Promise.all([
    db
      .select({
        id: connections.id,
        connectorKey: connections.connectorKey,
        name: connections.name,
        health: connections.health,
        lastSuccessAt: connections.lastSuccessAt,
        lastErrorCode: connections.lastErrorCode,
        lastErrorMessage: connections.lastErrorMessage,
        periodUsageMicros: connections.periodUsageMicros,
        hardCapMicros: connections.hardCapMicros,
        freezeAgeDays: connections.freezeAgeDays,
      })
      .from(connections)
      .where(eq(connections.workspaceId, member.workspaceId))
      .orderBy(connections.name),
    db
      .select({
        apiFamily: connectorSkills.apiFamily,
        version: connectorSkills.version,
        checksum: connectorSkills.checksum,
      })
      .from(connectorSkills)
      .where(
        and(
          eq(connectorSkills.workspaceId, member.workspaceId),
          eq(connectorSkills.active, true),
        ),
      )
      .orderBy(desc(connectorSkills.version)),
  ]);
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-4xl font-semibold tracking-tight">Connections and API policy</h1>
      <p className="mt-3 text-sm text-black/55">
        Credentials are write-only: encrypted values are never returned to this page.
      </p>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <ConnectionForm />
        <SkillVersionForm workspaceId={member.workspaceId} />
        <SpendingCapForm
          connections={connectionRows.map(({ id, name }) => ({ id, name }))}
          workspaceId={member.workspaceId}
        />
      </div>
      <section className="mt-8 rounded-3xl border border-black/10 bg-white p-6">
        <h2 className="text-lg font-semibold">Configured connections</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead><tr><th>Name</th><th>Context</th><th>Health</th><th>Usage / cap</th><th>Freeze</th><th>Last result</th></tr></thead>
            <tbody>
              {connectionRows.map((connection) => (
                <tr className="border-t border-black/10" key={connection.id}>
                  <td className="py-3 font-medium">{connection.name}</td>
                  <td>{connection.connectorKey}</td>
                  <td>{connection.health}</td>
                  <td>{connection.periodUsageMicros} / {connection.hardCapMicros} μ</td>
                  <td>{connection.freezeAgeDays} days</td>
                  <td>{connection.lastSuccessAt?.toLocaleString() ?? connection.lastErrorCode ?? "Never read"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mt-6 rounded-3xl border border-black/10 bg-white p-6">
        <h2 className="text-lg font-semibold">Active API skills</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {activeSkills.map((skill) => (
            <li key={`${skill.apiFamily}-${skill.version}`}>
              {skill.apiFamily.toUpperCase()} · Version {skill.version} · checksum {skill.checksum}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
