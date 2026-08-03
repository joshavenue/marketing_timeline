import { redirect } from "next/navigation";

import { HistoryTimeline } from "@/components/timeline/HistoryTimeline";
import { InitiativeDrawer } from "@/components/initiatives/InitiativeDrawer";
import { TimelineFilters } from "@/components/timeline/TimelineFilters";
import { getInitiativeDetail } from "@/db/queries/initiative-details";
import { requireCurrentWorkspaceMember } from "@/lib/auth/access";
import {
  getTimelineWindow,
  type TimelineZoom,
} from "@/lib/timeline/query";

function isZoom(value: string | undefined): value is TimelineZoom {
  return ["year", "quarter", "month", "week"].includes(value ?? "");
}

function dateOffset(date: Date, years: number) {
  const next = new Date(date);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next.toISOString().slice(0, 10);
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let member;
  try {
    member = await requireCurrentWorkspaceMember();
  } catch {
    redirect("/login");
  }
  const params = await searchParams;
  const zoomValue =
    typeof params.zoom === "string" ? params.zoom : undefined;
  const zoom: TimelineZoom = isZoom(zoomValue) ? zoomValue : "quarter";
  const now = new Date();
  const start =
    typeof params.start === "string" ? params.start : dateOffset(now, -1);
  const end =
    typeof params.end === "string" ? params.end : dateOffset(now, 1);
  const query = typeof params.query === "string" ? params.query : undefined;
  const campaign =
    typeof params.campaign === "string" && params.campaign
      ? [params.campaign]
      : undefined;
  const status =
    typeof params.status === "string" && params.status
      ? [params.status]
      : undefined;
  const contributor =
    typeof params.contributor === "string" && params.contributor
      ? [params.contributor]
      : undefined;
  const metricDefinitionId =
    typeof params.metric === "string" && params.metric
      ? params.metric
      : undefined;
  const model = await getTimelineWindow({
    workspaceId: member.workspaceId,
    start,
    end,
    zoom,
    query,
    campaignIds: campaign,
    statuses: status,
    contributors: contributor,
    metricDefinitionId,
  });
  const timelineSearch = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== "initiative" && typeof value === "string") {
      timelineSearch.set(key, value);
    }
  }
  const timelineHref = `/timeline${
    timelineSearch.size ? `?${timelineSearch.toString()}` : ""
  }`;
  const selectedInitiativeId =
    typeof params.initiative === "string" ? params.initiative : null;
  const selectedInitiative = selectedInitiativeId
    ? await getInitiativeDetail(member.workspaceId, selectedInitiativeId)
    : null;
  const activeInitiatives = model.events.filter(
    (event) =>
      event.kind === "initiative" &&
      event.status?.toLowerCase() === "active",
  ).length;
  const observedMetrics = model.growthSeries?.points.length ?? 0;

  return (
    <main className="mx-auto max-w-[1600px] px-8 py-10 xl:px-12">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-evidence)]">
            Past → present → future
          </p>
          <h1 className="mt-3 text-[40px] font-semibold leading-[44px] tracking-[-0.035em]">
            Marketing history
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-6 text-[var(--color-muted)]">
            See what the team planned, shipped, and learned—then open the cited
            evidence behind every initiative.
          </p>
        </div>
        <dl className="flex items-end gap-7">
          <div>
            <dd className="text-3xl font-semibold text-[var(--color-ocean)]">
              {activeInitiatives}
            </dd>
            <dt className="mt-1 text-sm text-[var(--color-muted)]">
              Active initiatives
            </dt>
          </div>
          <div>
            <dd className="text-3xl font-semibold text-[var(--color-ocean)]">
              {observedMetrics}
            </dd>
            <dt className="mt-1 text-sm text-[var(--color-muted)]">
              Metrics in view
            </dt>
          </div>
          <div className="mb-1 rounded-full bg-[var(--color-ocean)] px-4 py-2 text-sm font-semibold text-white">
            <span className="mr-2 text-[var(--color-signal)]">●</span>
            History is live
          </div>
        </dl>
      </div>
      <div className="mb-6">
        <TimelineFilters
          campaigns={model.filters.campaigns}
          contributors={model.filters.contributors}
          current={{
            query,
            campaign: typeof params.campaign === "string" ? params.campaign : undefined,
            status: typeof params.status === "string" ? params.status : undefined,
            contributor:
              typeof params.contributor === "string"
                ? params.contributor
                : undefined,
            metricDefinitionId:
              metricDefinitionId ?? model.growthSeries?.definition.id,
            start,
            end,
            zoom,
          }}
          metrics={model.growthOptions}
          statuses={model.filters.statuses}
        />
      </div>
      <HistoryTimeline
        end={model.end}
        events={model.events}
        start={model.start}
        timelineHref={timelineHref}
        zoom={model.zoom}
      />
      {selectedInitiative ? (
        <InitiativeDrawer
          backHref={timelineHref}
          detail={selectedInitiative}
          fullPageHref={`/initiatives/${selectedInitiative.id}?from=${encodeURIComponent(timelineHref)}`}
        />
      ) : null}
    </main>
  );
}
