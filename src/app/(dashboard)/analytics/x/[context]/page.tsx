import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { db } from "@/db/client";
import { metricDefinitions, metricObservations } from "@/db/schema";
import { requireCurrentWorkspaceMember } from "@/lib/auth/access";

const contexts = {
  post: {
    connectorKey: "x_post" as const,
    title: "X post analytics",
    description: "Owned-post public, non-public, organic, and promoted measurements.",
  },
  account: {
    connectorKey: "x_account" as const,
    title: "X account analytics",
    description: "Account-level measurements exposed for the configured authentication context.",
  },
  ads: {
    connectorKey: "x_ads" as const,
    title: "X Ads analytics",
    description: "Paid campaign delivery, engagement, and exact local billed charge.",
  },
};

export default async function XAnalyticsPage({
  params,
}: {
  params: Promise<{ context: string }>;
}) {
  let member;
  try {
    member = await requireCurrentWorkspaceMember();
  } catch {
    redirect("/login");
  }
  const { context } = await params;
  const definition = contexts[context as keyof typeof contexts];
  if (!definition) notFound();
  const rows = await db
    .select({
      id: metricObservations.id,
      name: metricDefinitions.name,
      kind: metricDefinitions.kind,
      value: metricObservations.value,
      unit: metricObservations.unit,
      freshness: metricObservations.freshness,
      observedAt: metricObservations.observedAt,
      sourceUrl: metricObservations.sourceUrl,
    })
    .from(metricDefinitions)
    .leftJoin(
      metricObservations,
      eq(metricObservations.metricDefinitionId, metricDefinitions.id),
    )
    .where(
      and(
        eq(metricDefinitions.workspaceId, member.workspaceId),
        eq(metricDefinitions.connectorKey, definition.connectorKey),
        eq(metricDefinitions.publicationStatus, "published"),
      ),
    )
    .orderBy(metricDefinitions.name, desc(metricObservations.observedAt));
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <nav className="flex gap-3 text-xs font-semibold">
        {Object.entries(contexts).map(([key, item]) => (
          <Link
            aria-current={key === context ? "page" : undefined}
            className={key === context ? "text-blue-700" : "text-black/45"}
            href={`/analytics/x/${key}`}
            key={key}
          >
            {item.title}
          </Link>
        ))}
      </nav>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">{definition.title}</h1>
      <p className="mt-3 text-sm text-black/55">{definition.description}</p>
      <p className="mt-1 text-xs text-black/40">
        Cached evidence only. Opening this view never triggers an X read.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {rows.length ? rows.map((row, index) => (
          <article className="rounded-2xl border border-black/10 bg-white p-5" key={row.id ?? `${row.name}-${index}`}>
            <div className="flex justify-between gap-3">
              <h2 className="text-sm font-semibold">{row.name}</h2>
              <span className="text-[10px] font-semibold uppercase">{row.kind}</span>
            </div>
            <p className="mt-3 text-3xl font-semibold">{row.value ?? "Unavailable"} <span className="text-xs font-normal text-black/45">{row.unit}</span></p>
            <p className="mt-3 text-xs text-black/45">
              {row.freshness ?? "No observation"} · Last read {row.observedAt?.toLocaleString() ?? "never"}
            </p>
            {row.sourceUrl ? <a className="mt-2 inline-block text-xs font-medium text-blue-700 underline" href={row.sourceUrl} rel="noreferrer" target="_blank">Source citation</a> : null}
          </article>
        )) : (
          <p className="rounded-2xl border border-dashed border-black/15 p-6 text-sm text-black/45">
            No cached observations exist for this X context.
          </p>
        )}
      </div>
    </main>
  );
}
