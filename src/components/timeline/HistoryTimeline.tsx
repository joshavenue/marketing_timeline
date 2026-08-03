"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";

import { GrowthRail } from "@/components/timeline/GrowthRail";
import { TimelineEvent } from "@/components/timeline/TimelineEvent";
import type {
  TimelineLayoutEvent,
  TimelineZoom,
} from "@/lib/timeline/query";
import type { GrowthSeriesReadModel } from "@/lib/metrics/growth-series";

const VIEWPORT_KEY = "timeline.viewport";
const zoomScale: Record<TimelineZoom, number> = {
  year: 1.6,
  quarter: 4,
  month: 9,
  week: 22,
};

function dayNumber(value: string) {
  return Date.parse(`${value}T00:00:00.000Z`) / 86_400_000;
}

function timelineHrefWithZoom(timelineHref: string, zoom: TimelineZoom) {
  const url = new URL(timelineHref, "http://timeline.local");
  url.searchParams.set("zoom", zoom);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function HistoryTimeline({
  events,
  start,
  end,
  zoom,
  timelineHref,
  growthSeries,
}: {
  events: TimelineLayoutEvent[];
  start: string;
  end: string;
  zoom: TimelineZoom;
  timelineHref: string;
  growthSeries: GrowthSeriesReadModel | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startDay = dayNumber(start);
  const totalDays = Math.max(1, dayNumber(end) - startDay);
  const contentWidth = Math.max(1400, totalDays * zoomScale[zoom]);
  const today = new Date().toISOString().slice(0, 10);
  const todayLeft = Math.min(
    contentWidth,
    Math.max(0, ((dayNumber(today) - startDay) / totalDays) * contentWidth),
  );
  const campaignBands = useMemo(
    () =>
      events
        .filter((event) => event.kind === "campaign")
        .map((event) => {
          const left = Math.max(
            80,
            ((dayNumber(event.start) - startDay) / totalDays) * contentWidth,
          );
          const endLeft = Math.min(
            contentWidth - 80,
            ((dayNumber(event.end ?? event.start) - startDay) / totalDays) *
              contentWidth,
          );
          return {
            event,
            left,
            width: Math.max(220, endLeft - left),
          };
        }),
    [contentWidth, events, startDay, totalDays],
  );
  const positioned = useMemo(
    () =>
      events
        .filter((event) => event.kind !== "campaign")
        .map((event) => ({
          event,
          left: Math.min(
            contentWidth - 104,
            Math.max(
              104,
              ((dayNumber(event.markerDate) - startDay) / totalDays) *
                contentWidth,
            ),
          ),
        })),
    [contentWidth, events, startDay, totalDays],
  );

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const stored = window.localStorage.getItem(VIEWPORT_KEY);
    if (stored) {
      try {
        const viewport = JSON.parse(stored) as {
          scrollLeft?: number;
          zoom?: TimelineZoom;
        };
        if (viewport.zoom === zoom && Number.isFinite(viewport.scrollLeft)) {
          container.scrollLeft = viewport.scrollLeft ?? 0;
          return;
        }
      } catch {
        window.localStorage.removeItem(VIEWPORT_KEY);
      }
    }
    container.scrollLeft = Math.max(
      0,
      todayLeft - container.clientWidth / 2,
    );
  }, [todayLeft, zoom]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  function saveViewport() {
    const container = scrollRef.current;
    if (!container) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const viewport = { scrollLeft: container.scrollLeft, zoom };
      window.localStorage.setItem(
        VIEWPORT_KEY,
        JSON.stringify(viewport),
      );
      void fetch("/api/preferences/timeline", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(viewport),
      }).catch(() => undefined);
    }, 500);
  }

  function jumpToToday() {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({
      left: Math.max(0, todayLeft - container.clientWidth / 2),
      behavior: "smooth",
    });
  }

  return (
    <section className="overflow-hidden rounded-[var(--radius-panel)] border border-black/10 bg-[var(--color-fog)]/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-white px-5 py-3">
        <p className="text-sm font-semibold text-[var(--color-ink)]">
          {start.slice(0, 4)} — {end.slice(0, 4)}
        </p>
        <div className="flex items-center gap-1 rounded-full bg-black/[0.045] p-1">
          {(["year", "quarter", "month", "week"] as const).map((value) => (
            <Link
              aria-current={zoom === value ? "page" : undefined}
              className={`grid min-h-8 place-items-center rounded-full px-3 text-xs font-medium capitalize ${
                zoom === value
                  ? "bg-[var(--color-ocean)] text-white"
                  : "text-[var(--color-muted)]"
              }`}
              href={timelineHrefWithZoom(timelineHref, value)}
              key={value}
            >
              {value}
            </Link>
          ))}
        </div>
        <button
          className="min-h-10 rounded-full bg-[var(--color-signal)] px-5 text-sm font-semibold text-[var(--color-ink)]"
          onClick={jumpToToday}
          type="button"
        >
          Jump to today
        </button>
      </div>

      <div
        aria-label="Marketing history timeline"
        className="relative h-[540px] overflow-x-auto overflow-y-hidden scroll-smooth"
        data-testid="timeline-scroll"
        onScroll={saveViewport}
        ref={scrollRef}
        tabIndex={0}
      >
        <div className="relative h-full" style={{ width: contentWidth }}>
          {campaignBands.map(({ event, left, width }) => (
            <div
              className="absolute top-6 flex h-9 items-center justify-between rounded-full bg-[#dce9eb] px-4 text-xs font-semibold text-[var(--color-ocean)]"
              data-testid="campaign-band"
              key={event.id}
              style={{ left, width }}
            >
              <span>● Campaign · {event.title}</span>
              <span className="font-normal">
                {event.start} — {event.end ?? event.start}
              </span>
            </div>
          ))}
          <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-black/70" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 border-y-[7px] border-l-[12px] border-y-transparent border-l-black/70" />
          <div
            className="absolute top-12 bottom-12 w-px bg-[var(--color-signal)]"
            data-testid="today-marker"
            style={{ left: todayLeft }}
          >
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-signal)] px-3 py-1 text-[11px] font-semibold text-[var(--color-ink)]">
              Today
            </span>
          </div>
          {positioned.map(({ event, left }) => (
            <TimelineEvent
              event={event}
              key={event.id}
              left={left}
              timelineHref={timelineHref}
            />
          ))}
          {positioned.length === 0 ? (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-10 rounded-2xl border border-dashed border-black/15 bg-white/80 px-6 py-4 text-sm text-black/45">
              No published events match this window.
            </div>
          ) : null}
        </div>
      </div>
      <GrowthRail end={end} series={growthSeries} start={start} />
    </section>
  );
}
