"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SkillVersionForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [apiFamily, setApiFamily] = useState("x");
  const [version, setVersion] = useState(1);
  const [markdown, setMarkdown] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/settings/skills", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, apiFamily, version, markdown }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Could not activate skill");
      return;
    }
    setMessage(`Version ${version} activated.`);
    router.refresh();
  }
  return (
    <form className="rounded-3xl border border-black/10 bg-white p-6" onSubmit={submit}>
      <h2 className="text-lg font-semibold">API skill version</h2>
      <div className="mt-4 grid gap-3">
        <label className="text-xs font-medium">API family
          <input className="mt-1 block w-full rounded-xl border border-black/10 p-3 text-sm" onChange={(event) => setApiFamily(event.target.value)} value={apiFamily} />
        </label>
        <label className="text-xs font-medium">Skill version
          <input className="mt-1 block w-full rounded-xl border border-black/10 p-3 text-sm" min={1} onChange={(event) => setVersion(Number(event.target.value))} type="number" value={version} />
        </label>
        <label className="text-xs font-medium">SKILL.md
          <textarea className="mt-1 block min-h-56 w-full rounded-xl border border-black/10 p-3 font-mono text-xs" maxLength={256 * 1024} onChange={(event) => setMarkdown(event.target.value)} required value={markdown} />
        </label>
        <button className="rounded-full bg-black px-4 py-2 text-sm text-white" type="submit">Activate skill</button>
        <p aria-live="polite" className="text-xs text-black/55">{message}</p>
      </div>
    </form>
  );
}
