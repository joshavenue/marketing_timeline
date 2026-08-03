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
  mode = "page",
}: {
  detail: Detail;
  backHref?: string;
  mode?: "drawer" | "page";
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
  const drawer = mode === "drawer";
  const panelClass = drawer
    ? "border-b border-black/10 py-7"
    : "rounded-[var(--radius-panel)] border border-black/10 bg-white p-6";

  return (
    <article className={drawer ? "px-6 py-7" : "mx-auto max-w-5xl px-6 py-8"}>
      {drawer ? null : (
        <Link
          className="text-sm font-medium text-[var(--color-evidence)]"
          href={backHref}
        >
          ← Back to timeline
        </Link>
      )}
      <header
        className={
          drawer
            ? "border-b border-black/10 pb-6"
            : "mt-6 rounded-[var(--radius-panel)] border border-black/10 bg-white p-7"
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-evidence)]">
              {detail.campaignName ?? "Unassigned campaign"}
            </p>
            <h1
              className={`${drawer ? "text-3xl" : "text-4xl"} mt-3 font-semibold tracking-[-0.03em]`}
            >
              {detail.name}
            </h1>
          </div>
          <span className="rounded-full bg-[var(--color-signal)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ocean)]">
            ● {detail.lifecycleStatus}
          </span>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--color-muted)]">
          {detail.overview ?? "No overview was supplied by Notion."}
        </p>
        <dl
          className={`mt-6 grid gap-4 border-t border-black/10 pt-5 ${drawer ? "grid-cols-2" : "sm:grid-cols-4"}`}
        >
          <div><dt className="text-xs uppercase tracking-[0.08em] text-[var(--color-muted)]">Dates</dt><dd className="mt-1 text-sm font-semibold">{detail.startDate}{detail.endDate ? ` — ${detail.endDate}` : ""}</dd></div>
          <div><dt className="text-xs uppercase tracking-[0.08em] text-[var(--color-muted)]">Owner</dt><dd className="mt-1 text-sm font-semibold">{detail.ownerName ?? "Not recorded"}</dd></div>
          <div><dt className="text-xs uppercase tracking-[0.08em] text-[var(--color-muted)]">Planned budget</dt><dd className="mt-1 text-sm font-semibold">{money(detail.plannedBudget)}</dd></div>
          <div><dt className="text-xs uppercase tracking-[0.08em] text-[var(--color-muted)]">Actual spend</dt><dd className="mt-1 text-sm font-semibold text-[var(--color-ocean)]">{money(detail.actualSpend)}</dd></div>
        </dl>
      </header>

      <section className="border-b border-black/10 py-7">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
            Performance evidence
          </h2>
          <span className="rounded-full bg-[#eaf0ff] px-3 py-1 text-xs font-medium text-[var(--color-evidence)]">
            ● Cited metrics
          </span>
        </div>
        <MetricSeries compact={drawer} metrics={metrics} />
      </section>

      <div className={`grid gap-6 ${drawer ? "" : "mt-6 md:grid-cols-2"}`}>
        <section className={panelClass}>
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
            Contributions
          </h2>
          {detail.contributions.length ? (
            <ol className="mt-4 space-y-3 text-sm">
              {detail.contributions.map((item, index) => (
                <li className="flex items-start gap-3" key={item.eventId}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-ocean)] text-xs font-semibold text-[var(--color-signal)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="pt-1.5">
                    {item.title} | {item.contributors.join(", ")}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-[var(--color-muted)]">
              No effort records linked yet.
            </p>
          )}
        </section>
        <section className={panelClass}>
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
            Source provenance
          </h2>
          <p className="mt-4 text-sm font-semibold text-[var(--color-ocean)]">
            {detail.sourceSnapshot?.connectionName ?? "Notion"} is the planning source
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Source state: <strong>{detail.sourceState}</strong> · Last read{" "}
            {(detail.sourceSnapshot?.observedAt ?? detail.updatedAt).toLocaleString()}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {detail.versions.map((version) => (
              <li key={version.version}>
                Version {version.version} · {version.createdAt.toLocaleString()}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {sourceUrls.map((url) => (
              <a
                className="text-sm font-medium text-[var(--color-evidence)] underline"
                href={url}
                key={url}
                rel="noreferrer"
                target="_blank"
              >
                Open cited source ↗
              </a>
            ))}
          </div>
        </section>
      </div>
      <CommentThread
        entityId={detail.id}
        entityType="initiative"
        title={drawer ? "Team interpretation" : "Team comments"}
      />
    </article>
  );
}
