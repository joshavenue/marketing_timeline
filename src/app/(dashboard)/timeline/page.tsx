import { redirect } from "next/navigation";

import { HistoryTimeline } from "@/components/timeline/HistoryTimeline";
import { InitiativeDrawer } from "@/components/initiatives/InitiativeDrawer";
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
  const model = await getTimelineWindow({
    workspaceId: member.workspaceId,
    start,
    end,
    zoom,
    query,
    campaignIds: campaign,
    statuses: status,
    contributors: contributor,
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

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
            Past → present → future
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.035em]">
            Marketing history
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">
            Read every published initiative in chronological context, then open
            its evidence to inspect budget, effort, metrics, and source history.
          </p>
        </div>
        <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" method="get">
          <input name="zoom" type="hidden" value={zoom} />
          <label className="sr-only" htmlFor="timeline-search">
            Search timeline
          </label>
          <input
            className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            defaultValue={query}
            id="timeline-search"
            name="query"
            placeholder="Search initiatives…"
          />
          <input
            className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            defaultValue={typeof params.campaign === "string" ? params.campaign : ""}
            name="campaign"
            placeholder="Campaign ID"
          />
          <input
            className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            defaultValue={typeof params.status === "string" ? params.status : ""}
            name="status"
            placeholder="Lifecycle status"
          />
          <input
            className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            defaultValue={
              typeof params.contributor === "string" ? params.contributor : ""
            }
            name="contributor"
            placeholder="Contributor"
          />
          <button
            className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white"
            type="submit"
          >
            Filter
          </button>
        </form>
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
