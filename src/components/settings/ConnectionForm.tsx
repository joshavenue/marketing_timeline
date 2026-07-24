"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ConnectionForm() {
  const router = useRouter();
  const [connectorKey, setConnectorKey] = useState("notion");
  const [name, setName] = useState("");
  const [credential, setCredential] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(
      "/api/settings/connections",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          connectorKey,
          name,
          credential,
          confirmed,
        }),
      },
    );
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Could not save connection");
      return;
    }
    setName("");
    setCredential("");
    setConfirmed(false);
    setMessage("Connection saved. Credential encrypted and hidden.");
    router.refresh();
  }

  return (
    <form className="rounded-3xl border border-black/10 bg-white p-6" onSubmit={submit}>
      <h2 className="text-lg font-semibold">Add connection</h2>
      <div className="mt-4 grid gap-3">
        <label className="text-xs font-medium">Connector
          <select className="mt-1 block w-full rounded-xl border border-black/10 p-3 text-sm" onChange={(event) => setConnectorKey(event.target.value)} value={connectorKey}>
            <option value="notion">Notion</option>
            <option value="x_post">X post analytics</option>
            <option value="x_account">X account analytics</option>
            <option value="x_ads">X Ads analytics</option>
          </select>
        </label>
        <label className="text-xs font-medium">Connection name
          <input className="mt-1 block w-full rounded-xl border border-black/10 p-3 text-sm" onChange={(event) => setName(event.target.value)} required value={name} />
        </label>
        <label className="text-xs font-medium">Credential JSON
          <textarea className="mt-1 block min-h-24 w-full rounded-xl border border-black/10 p-3 font-mono text-xs" onChange={(event) => setCredential(event.target.value)} required value={credential} />
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required type="checkbox" />
          Confirm credential rotation
        </label>
        <button className="rounded-full bg-black px-4 py-2 text-sm text-white" type="submit">Save connection</button>
        <p aria-live="polite" className="text-xs text-black/55">{message}</p>
      </div>
    </form>
  );
}
