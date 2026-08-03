import Link from "next/link";

import { CommentThread } from "@/components/comments/CommentThread";
import { MetricSeries } from "@/components/metrics/MetricSeries";
import type { getInitiativeDetail } from "@/db/queries/initiative-details";
import { calculateMetric } from "@/lib/metrics/calculate";

type Detail = NonNullable<Awaited<ReturnType<typeof getInitiativeDetail>>>;

function money(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

export function InitiativeDetail({
  detail,
  backHref = "/timeline",
}: {
  detail: Detail;
  backHref?: string;
}) {
  const sourceUrls = Array.isArray(detail.sourceUrls)
    ? detail.sourceUrls.filter((value): value is string => typeof value === "string")
    : [];
  const metrics =
    detail.plannedBudget && detail.actualSpend
      ? [
          ...detail.metrics,
          {
            id: "budget-variance",
            name: "Budget variance",
            kind: "calculated" as const,
            formulaKey: "budget_variance",
            externalMetricKey: "actual, planned",
            unit: "USD",
            value: String(
              calculateMetric("budget_variance", {
                actual: Number(detail.actualSpend),
                planned: Number(detail.plannedBudget),
              }),
            ),
            observedAt: detail.updatedAt,
            frozenAt: null,
            sourceUrl: sourceUrls[0] ?? null,
            inputs: {
              actual: Number(detail.actualSpend),
              planned: Number(detail.plannedBudget),
            },
          },
        ]
      : detail.metrics;
  return (
    <article className="mx-auto max-w-5xl px-6 py-8">
      <Link className="text-sm font-medium text-blue-700" href={backHref}>
        ← Back to timeline
      </Link>
      <header className="mt-6 rounded-[28px] border border-black/10 bg-white p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              {detail.campaignName ?? "Unassigned campaign"}
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              {detail.name}
            </h1>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
            {detail.lifecycleStatus}
          </span>
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-black/60">
          {detail.overview ?? "No overview was supplied by Notion."}
        </p>
        <dl className="mt-6 grid gap-4 border-t border-black/10 pt-5 sm:grid-cols-4">
          <div><dt className="text-xs text-black/45">Dates</dt><dd className="mt-1 text-sm font-medium">{detail.startDate}{detail.endDate ? ` — ${detail.endDate}` : ""}</dd></div>
          <div><dt className="text-xs text-black/45">Owner</dt><dd className="mt-1 text-sm font-medium">{detail.ownerName ?? "Not recorded"}</dd></div>
          <div><dt className="text-xs text-black/45">Planned budget</dt><dd className="mt-1 text-sm font-medium">{money(detail.plannedBudget)}</dd></div>
          <div><dt className="text-xs text-black/45">Actual spend</dt><dd className="mt-1 text-sm font-medium">{money(detail.actualSpend)}</dd></div>
        </dl>
      </header>

      <section className="mt-6">
        <h2 className="mb-3 text-xl font-semibold">Metrics and evidence</h2>
        <MetricSeries metrics={metrics} />
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-[24px] border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">Effort and contributors</h2>
          {detail.contributions.length ? (
            <ol className="mt-4 space-y-3 text-sm">
              {detail.contributions.map((item, index) => (
                <li key={item.eventId}>
                  {index + 1}) {item.title} | {item.contributors.join(", ")}
                </li>
              ))}
            </ol>
          ) : <p className="mt-4 text-sm text-black/45">No effort records linked yet.</p>}
        </section>
        <section className="rounded-[24px] border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">Source history</h2>
          <p className="mt-2 text-sm text-black/55">
            Source state: <strong>{detail.sourceState}</strong> · Last read{" "}
            {detail.updatedAt.toLocaleString()}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {detail.versions.map((version) => (
              <li key={version.version}>Version {version.version} · {version.createdAt.toLocaleString()}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {sourceUrls.map((url) => (
              <a className="text-sm font-medium text-blue-700 underline" href={url} key={url} rel="noreferrer" target="_blank">Notion source</a>
            ))}
          </div>
        </section>
      </div>
      <CommentThread entityId={detail.id} entityType="initiative" />
    </article>
  );
}
