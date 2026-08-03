import { GrowthChart } from "@/components/timeline/GrowthChart";
import type { GrowthSeriesReadModel } from "@/lib/metrics/growth-series";

export function GrowthRail({
  series,
  start,
  end,
}: {
  series: GrowthSeriesReadModel | null;
  start: string;
  end: string;
}) {
  return (
    <section className="border-t border-black/10 bg-white">
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-evidence)]">
          Company growth context
        </p>
        <span className="text-xs text-[var(--color-muted)]">
          Same window · same scale
        </span>
      </div>
      {series ? (
        <GrowthChart end={end} series={series} start={start} />
      ) : (
        <div
          aria-label="No growth data"
          className="m-5 grid min-h-32 place-items-center rounded-xl border border-dashed border-black/15 text-sm text-[var(--color-muted)]"
        >
          Select a published growth metric with recorded observations.
        </div>
      )}
      <p className="px-5 pb-4 pt-3 text-xs text-[var(--color-muted)]">
        Timing alignment supports human interpretation and does not prove
        causation.
      </p>
    </section>
  );
}
