import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/navigation/DashboardHeader";
import { db } from "@/db/client";
import { workspaces } from "@/db/schema";
import { requireCurrentWorkspaceMember } from "@/lib/auth/access";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let member;
  try {
    member = await requireCurrentWorkspaceMember();
  } catch {
    redirect("/login");
  }
  const [workspace] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, member.workspaceId))
    .limit(1);

  return (
    <div className="min-h-screen">
      <DashboardHeader
        memberEmail={member.email}
        workspaceName={workspace?.name ?? "Workspace"}
      />
      {children}
    </div>
  );
}
