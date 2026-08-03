import Link from "next/link";

import type { GrowthSeriesOption } from "@/db/queries/growth-series";
import type { TimelineZoom } from "@/lib/timeline/query";

interface TimelineFiltersProps {
  campaigns: Array<{ id: string; name: string }>;
  statuses: string[];
  contributors: string[];
  metrics: GrowthSeriesOption[];
  current: {
    query?: string;
    campaign?: string;
    status?: string;
    contributor?: string;
    metricDefinitionId?: string;
    start: string;
    end: string;
    zoom: TimelineZoom;
  };
}

const controlClass =
  "h-10 min-w-0 rounded-full border border-black/10 bg-white px-4 text-sm text-[var(--color-muted)] outline-none transition focus:border-[var(--color-evidence)]";

export function TimelineFilters({
  campaigns,
  statuses,
  contributors,
  metrics,
  current,
}: TimelineFiltersProps) {
  const clear = new URLSearchParams({
    zoom: current.zoom,
    start: current.start,
    end: current.end,
  });
  if (current.metricDefinitionId) {
    clear.set("metric", current.metricDefinitionId);
  }

  return (
    <form
      action="/timeline"
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 bg-[var(--color-fog)]/45 p-3"
      method="get"
    >
      <input name="zoom" type="hidden" value={current.zoom} />
      <input name="start" type="hidden" value={current.start} />
      <input name="end" type="hidden" value={current.end} />

      <label className="sr-only" htmlFor="timeline-search">
        Search initiatives
      </label>
      <input
        className={`${controlClass} min-w-56 flex-1`}
        defaultValue={current.query}
        id="timeline-search"
        name="query"
        placeholder="Search initiatives…"
      />

      <label className="sr-only" htmlFor="timeline-campaign">
        Campaign
      </label>
      <select
        className={controlClass}
        defaultValue={current.campaign ?? ""}
        id="timeline-campaign"
        name="campaign"
      >
        <option value="">Campaign</option>
        {campaigns.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.name}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="timeline-status">
        Status
      </label>
      <select
        className={controlClass}
        defaultValue={current.status ?? ""}
        id="timeline-status"
        name="status"
      >
        <option value="">Status</option>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="timeline-contributor">
        Contributor
      </label>
      <select
        className={controlClass}
        defaultValue={current.contributor ?? ""}
        id="timeline-contributor"
        name="contributor"
      >
        <option value="">Contributor</option>
        {contributors.map((contributor) => (
          <option key={contributor} value={contributor}>
            {contributor}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="timeline-metric">
        Growth metric
      </label>
      <select
        className={controlClass}
        defaultValue={current.metricDefinitionId ?? ""}
        id="timeline-metric"
        name="metric"
      >
        <option value="">Growth metric</option>
        {metrics.map((metric) => (
          <option key={metric.id} value={metric.id}>
            {metric.name}
          </option>
        ))}
      </select>

      <button
        className="h-10 rounded-full bg-[var(--color-ocean)] px-5 text-sm font-semibold text-white"
        type="submit"
      >
        Filter
      </button>
      <Link
        className="grid h-10 place-items-center rounded-full px-3 text-sm font-medium text-[var(--color-evidence)]"
        href={`/timeline?${clear.toString()}`}
      >
        Clear filters
      </Link>
    </form>
  );
}
