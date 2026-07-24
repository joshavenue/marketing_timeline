"use client";

import { useState } from "react";

export function RefreshPreflight({
  connections,
  isAdmin,
}: {
  connections: Array<{ id: string; name: string }>;
  isAdmin: boolean;
}) {
  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function createJob() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          connectionId,
          objects: [{ externalObjectId: "canonical-notion-workspace" }],
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        job?: { id: string };
        preflight?: { estimatedCostMicros: number };
      };
      if (!response.ok) throw new Error(payload.error ?? "Refresh was not approved");
      setMessage(
        `Approved job ${payload.job?.id}. Estimated API cost: ${payload.preflight?.estimatedCostMicros ?? 0} μ.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-black/10 bg-white p-6">
      <h2 className="text-lg font-semibold">Manual refresh preflight</h2>
      <p className="mt-1 text-sm text-black/55">
        No read begins until an admin approves this explicit job. Notion is
        estimated at zero API cost and remains snapshot-first.
      </p>
      {connections.length ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <select
            className="rounded-full border border-black/10 px-4 py-2 text-sm"
            onChange={(event) => setConnectionId(event.target.value)}
            value={connectionId}
          >
            {connections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.name}
              </option>
            ))}
          </select>
          <button
            className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            disabled={!isAdmin || busy}
            onClick={createJob}
            type="button"
          >
            {busy ? "Approving…" : "Approve manual read"}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-amber-700">Configure a Notion connection first.</p>
      )}
      {!isAdmin ? (
        <p className="mt-3 text-xs text-amber-700">Admin permission is required.</p>
      ) : null}
      <p aria-live="polite" className="mt-3 text-xs text-black/55">{message}</p>
    </section>
  );
}
