import Link from "next/link";
import { redirect } from "next/navigation";

import { requireCurrentWorkspaceMember } from "@/lib/auth/access";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let member;
  try {
    member = await requireCurrentWorkspaceMember();
  } catch {
    redirect("/login");
  }
  if (member.role !== "admin") redirect("/timeline");
  return (
    <div>
      <nav className="mx-auto flex max-w-5xl gap-4 px-6 pt-8 text-sm font-medium text-black/55">
        <Link href="/settings/connections">Connections</Link>
        <Link href="/settings/notion">Notion</Link>
        <Link href="/settings/users">Users</Link>
        <Link href="/settings/audit">Audit</Link>
      </nav>
      {children}
    </div>
  );
}
