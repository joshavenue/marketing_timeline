import { deriveFreshness } from "@/lib/metrics/freshness";

export function MetricCard({
  metric,
}: {
  metric: {
    name: string;
    kind: "raw" | "calculated";
    formulaKey: string | null;
    externalMetricKey?: string;
    inputs?: Record<string, number>;
    unit: string;
    value: string | null;
    freshness?: "fresh" | "stale" | "frozen" | null;
    freezeAgeDays?: number | null;
    observedAt: Date | null;
    frozenAt: Date | null;
    sourceUrl: string | null;
  };
}) {
  const freshness = metric.observedAt
    ? deriveFreshness({
        observedAt: metric.observedAt,
        frozenAt: metric.frozenAt,
        now: new Date(),
        ...(metric.freezeAgeDays === null || metric.freezeAgeDays === undefined
          ? {}
          : { freezeAgeDays: metric.freezeAgeDays }),
        ...(metric.freshness ? { reportedFreshness: metric.freshness } : {}),
      })
    : null;
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{metric.name}</p>
        <span className="rounded-full bg-black/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">
          {metric.kind === "raw" ? "Raw source" : "Calculated"}
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold">
        {metric.value ?? "No reading"}{" "}
        <span className="text-sm font-normal text-black/45">{metric.unit}</span>
      </p>
      {metric.formulaKey ? (
        <div className="mt-2 text-xs text-black/50">
          <p>Formula: {metric.formulaKey.replaceAll("_", " ")}</p>
          <p>
            Inputs:{" "}
            {metric.inputs
              ? Object.entries(metric.inputs)
                  .map(([key, value]) => `${key}=${value}`)
                  .join(", ")
              : metric.externalMetricKey}
          </p>
        </div>
      ) : null}
      <div className="mt-4 flex items-center justify-between text-xs text-black/45">
        <span>
          {freshness === "frozen" && metric.freezeAgeDays
            ? `Frozen after ${metric.freezeAgeDays} days`
            : freshness ?? "Awaiting source"}
        </span>
        {metric.sourceUrl ? (
          <a
            className="font-medium text-blue-700 underline"
            href={metric.sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            View citation
          </a>
        ) : null}
      </div>
    </article>
  );
}
