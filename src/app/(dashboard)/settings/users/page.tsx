import { eq } from "drizzle-orm";

import { UserAdmin } from "@/components/settings/UserAdmin";
import { db } from "@/db/client";
import { memberships, users } from "@/db/schema";
import { requireCurrentWorkspaceMember } from "@/lib/auth/access";

export default async function UsersPage() {
  const member = await requireCurrentWorkspaceMember();
  const rows = await db
    .select({
      id: memberships.id,
      email: users.email,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.workspaceId, member.workspaceId));
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-4xl font-semibold tracking-tight">Users and permissions</h1>
      <UserAdmin members={rows} workspaceId={member.workspaceId} />
    </main>
  );
}
