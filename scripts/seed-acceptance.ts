import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { auditEvents, memberships, users, workspaces } from "@/db/schema";

async function main() {
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const googleEmail = process.env.BOOTSTRAP_GOOGLE_EMAIL;
  if (!adminEmail || !googleEmail) {
    throw new Error(
      "BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_GOOGLE_EMAIL are required",
    );
  }
  if (adminEmail !== googleEmail) {
    throw new Error("Bootstrap admin email must exactly match the Google account");
  }
  const [existingAdmin] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.role, "admin"), eq(memberships.active, true)))
    .limit(1);
  if (existingAdmin) {
    console.log("An active admin already exists; bootstrap is a no-op.");
    return;
  }
  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: process.env.BOOTSTRAP_WORKSPACE_NAME ?? "Marketing Timeline",
    })
    .returning({ id: workspaces.id });
  const [user] = await db
    .insert(users)
    .values({ email: adminEmail })
    .onConflictDoUpdate({
      target: users.email,
      set: { updatedAt: new Date() },
    })
    .returning({ id: users.id });
  await db.transaction(async (tx) => {
    await tx.insert(memberships).values({
      workspaceId: workspace!.id,
      userId: user!.id,
      role: "admin",
      active: true,
    });
    await tx.insert(auditEvents).values({
      workspaceId: workspace!.id,
      actorUserId: user!.id,
      action: "workspace.admin_bootstrapped",
      entityType: "workspace",
      entityId: workspace!.id,
      detailsJson: { email: adminEmail },
    });
  });
  console.log(`Bootstrapped invited admin ${adminEmail}.`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
