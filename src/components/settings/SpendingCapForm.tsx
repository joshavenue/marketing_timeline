"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SpendingCapForm({
  workspaceId,
  connections,
}: {
  workspaceId: string;
  connections: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? "");
  const [hardCapMicros, setHardCapMicros] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(`/api/settings/connections/${connectionId}/cap`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, hardCapMicros, confirmed }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Could not change cap");
      return;
    }
    setConfirmed(false);
    setMessage("Hard cap updated.");
    router.refresh();
  }
  return (
    <form className="rounded-3xl border border-black/10 bg-white p-6" onSubmit={submit}>
      <h2 className="text-lg font-semibold">Spending cap</h2>
      <div className="mt-4 grid gap-3">
        <label className="text-xs font-medium">Connection
          <select className="mt-1 block w-full rounded-xl border border-black/10 p-3 text-sm" onChange={(event) => setConnectionId(event.target.value)} value={connectionId}>
            {connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium">Hard cap in micros
          <input className="mt-1 block w-full rounded-xl border border-black/10 p-3 text-sm" min={0} onChange={(event) => setHardCapMicros(Number(event.target.value))} type="number" value={hardCapMicros} />
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required type="checkbox" />
          Confirm cap change
        </label>
        <button className="rounded-full bg-black px-4 py-2 text-sm text-white" disabled={!connectionId} type="submit">Update cap</button>
        <p aria-live="polite" className="text-xs text-black/55">{message}</p>
      </div>
    </form>
  );
}
