import { db } from "@/db/client";
import { workspaces } from "@/db/schema";

export async function createWorkspace(name: string) {
  const [workspace] = await db
    .insert(workspaces)
    .values({ name })
    .returning({ id: workspaces.id, name: workspaces.name });

  if (!workspace) {
    throw new Error("Workspace creation did not return a row");
  }

  return workspace;
}
