"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";

import { GrowthRail } from "@/components/timeline/GrowthRail";
import { TimelineEvent } from "@/components/timeline/TimelineEvent";
import type {
  TimelineLayoutEvent,
  TimelineZoom,
} from "@/lib/timeline/query";

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

export function HistoryTimeline({
  events,
  start,
  end,
  zoom,
  timelineHref,
}: {
  events: TimelineLayoutEvent[];
  start: string;
  end: string;
  zoom: TimelineZoom;
  timelineHref: string;
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
  const positioned = useMemo(
    () =>
      events.map((event) => ({
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
    <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#f7f5ef] shadow-[0_25px_70px_rgba(35,35,31,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-white/80 px-5 py-4">
        <div className="flex items-center gap-1 rounded-full bg-black/[0.045] p-1">
          {(["year", "quarter", "month", "week"] as const).map((value) => (
            <Link
              aria-current={zoom === value ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${
                zoom === value ? "bg-black text-white" : "text-black/55"
              }`}
              href={`?zoom=${value}`}
              key={value}
            >
              {value}
            </Link>
          ))}
        </div>
        <button
          className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-medium"
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
          <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-black/70" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 border-y-[7px] border-l-[12px] border-y-transparent border-l-black/70" />
          <div
            className="absolute top-12 bottom-12 w-px bg-rose-500/70"
            data-testid="today-marker"
            style={{ left: todayLeft }}
          >
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-600 px-2 py-1 text-[10px] font-semibold text-white">
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
          {events.length === 0 ? (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-10 rounded-2xl border border-dashed border-black/15 bg-white/80 px-6 py-4 text-sm text-black/45">
              No published events match this window.
            </div>
          ) : null}
        </div>
      </div>
      <GrowthRail />
    </section>
  );
}
