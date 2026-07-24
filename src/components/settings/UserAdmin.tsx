"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserAdmin({
  workspaceId,
  members,
}: {
  workspaceId: string;
  members: Array<{ id: string; email: string; role: "admin" | "member" }>;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [message, setMessage] = useState("");
  async function invite(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/settings/invitations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, email, role }),
    });
    const payload = (await response.json()) as { error?: string; delivered?: boolean };
    if (!response.ok) setMessage(payload.error ?? "Invitation failed");
    else {
      setEmail("");
      setMessage(payload.delivered ? "Invitation sent." : "Invitation created; SMTP delivery is pending.");
    }
  }
  async function changeRole(membershipId: string, nextRole: string) {
    await fetch(`/api/settings/memberships/${membershipId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, role: nextRole }),
    });
    router.refresh();
  }
  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2">
      <form className="rounded-3xl border border-black/10 bg-white p-6" onSubmit={invite}>
        <h2 className="text-lg font-semibold">Invite by email</h2>
        <input aria-label="Invite email" className="mt-4 w-full rounded-xl border border-black/10 p-3 text-sm" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        <select aria-label="Invitation permission" className="mt-3 w-full rounded-xl border border-black/10 p-3 text-sm" onChange={(event) => setRole(event.target.value as "admin" | "member")} value={role}>
          <option value="member">Member</option><option value="admin">Admin</option>
        </select>
        <button className="mt-3 rounded-full bg-black px-4 py-2 text-sm text-white" type="submit">Create invitation</button>
        <p className="mt-2 text-xs text-black/55">{message}</p>
      </form>
      <section className="rounded-3xl border border-black/10 bg-white p-6">
        <h2 className="text-lg font-semibold">Registered users</h2>
        <ul className="mt-4 space-y-3">
          {members.map((member) => (
            <li className="flex items-center justify-between gap-3 text-sm" key={member.id}>
              <span>{member.email}</span>
              <select aria-label={`Permission for ${member.email}`} onChange={(event) => void changeRole(member.id, event.target.value)} value={member.role}>
                <option value="member">Member</option><option value="admin">Admin</option>
              </select>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
