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
  const [externalObjectId, setExternalObjectId] = useState(
    "canonical-notion-workspace",
  );
  const [observedAt, setObservedAt] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [preflight, setPreflight] = useState<{
    eligible: unknown[];
    frozen: unknown[];
    invalid: unknown[];
    operationCount: number;
    estimatedCostMicros: number;
    periodUsageMicros: number;
    remainingCapMicros: number;
    canApprove: boolean;
    blockers: string[];
  } | null>(null);

  function requestBody() {
    return {
      connectionId,
      objects: [
        {
          externalObjectId,
          ...(observedAt ? { observedAt: new Date(observedAt).toISOString() } : {}),
        },
      ],
    };
  }

  async function preview() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/jobs/preflight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody()),
      });
      const payload = (await response.json()) as {
        error?: string;
        preflight?: typeof preflight;
      };
      if (!response.ok || !payload.preflight) {
        throw new Error(payload.error ?? "Could not preview refresh");
      }
      setPreflight(payload.preflight);
      setMessage("Preview ready. No external read has occurred.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  async function createJob() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody()),
      });
      const payload = (await response.json()) as {
        error?: string;
        job?: { id: string };
      };
      if (!response.ok) throw new Error(payload.error ?? "Refresh was not approved");
      setMessage(`Approved job ${payload.job?.id}.`);
      setPreflight(null);
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
            aria-label="Refresh connection"
            className="rounded-full border border-black/10 px-4 py-2 text-sm"
            onChange={(event) => {
              setConnectionId(event.target.value);
              setPreflight(null);
            }}
            value={connectionId}
          >
            {connections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.name}
              </option>
            ))}
          </select>
          <input
            aria-label="External object ID"
            className="rounded-full border border-black/10 px-4 py-2 text-sm"
            onChange={(event) => {
              setExternalObjectId(event.target.value);
              setPreflight(null);
            }}
            placeholder="External object ID"
            value={externalObjectId}
          />
          <input
            aria-label="Source observation timestamp"
            className="rounded-full border border-black/10 px-4 py-2 text-sm"
            onChange={(event) => {
              setObservedAt(event.target.value);
              setPreflight(null);
            }}
            type="datetime-local"
            value={observedAt}
          />
          <button
            className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            disabled={!isAdmin || busy}
            onClick={preview}
            type="button"
          >
            {busy ? "Checking…" : "Preview manual read"}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-amber-700">Configure a Notion connection first.</p>
      )}
      {!isAdmin ? (
        <p className="mt-3 text-xs text-amber-700">Admin permission is required.</p>
      ) : null}
      {preflight ? (
        <div className="mt-5 rounded-2xl bg-black/[0.035] p-4 text-xs">
          <dl className="grid gap-3 sm:grid-cols-4">
            <div><dt>Scope</dt><dd className="font-semibold">{externalObjectId}</dd></div>
            <div><dt>Eligible / frozen / invalid</dt><dd className="font-semibold">{preflight.eligible.length} / {preflight.frozen.length} / {preflight.invalid.length}</dd></div>
            <div><dt>Operations / estimate</dt><dd className="font-semibold">{preflight.operationCount} / {preflight.estimatedCostMicros} μ</dd></div>
            <div><dt>Usage / remaining cap</dt><dd className="font-semibold">{preflight.periodUsageMicros} / {preflight.remainingCapMicros} μ</dd></div>
          </dl>
          {preflight.blockers.length ? <p className="mt-3 text-rose-700">{preflight.blockers.join(" · ")}</p> : null}
          <button
            className="mt-4 rounded-full bg-black px-4 py-2 font-semibold text-white disabled:opacity-40"
            disabled={!preflight.canApprove || busy}
            onClick={createJob}
            type="button"
          >
            Confirm and queue read
          </button>
        </div>
      ) : null}
      <p aria-live="polite" className="mt-3 text-xs text-black/55">{message}</p>
    </section>
  );
}
