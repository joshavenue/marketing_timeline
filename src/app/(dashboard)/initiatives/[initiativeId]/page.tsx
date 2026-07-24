import { notFound, redirect } from "next/navigation";

import { InitiativeDetail } from "@/components/initiatives/InitiativeDetail";
import { getInitiativeDetail } from "@/db/queries/initiative-details";
import { requireCurrentWorkspaceMember } from "@/lib/auth/access";

export default async function InitiativePage({
  params,
  searchParams,
}: {
  params: Promise<{ initiativeId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  let member;
  try {
    member = await requireCurrentWorkspaceMember();
  } catch {
    redirect("/login");
  }
  const { initiativeId } = await params;
  const detail = await getInitiativeDetail(member.workspaceId, initiativeId);
  if (!detail) notFound();
  const { from } = await searchParams;
  const backHref = from?.startsWith("/timeline") ? from : "/timeline";
  return <InitiativeDetail backHref={backHref} detail={detail} />;
}
