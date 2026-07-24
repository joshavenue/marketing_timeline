import Link from "next/link";

import type { TimelineLayoutEvent } from "@/lib/timeline/query";

export function TimelineEvent({
  event,
  left,
  timelineHref,
}: {
  event: TimelineLayoutEvent;
  left: number;
  timelineHref: string;
}) {
  const isTop = event.side === "top";
  return (
    <article
      className="absolute w-52 -translate-x-1/2"
      data-event-id={event.id}
      data-testid="timeline-marker"
      style={{
        left,
        top: isTop ? "calc(50% - 188px)" : "calc(50% + 24px)",
      }}
    >
      <div
        className={`absolute left-1/2 w-px -translate-x-1/2 bg-current ${
          isTop ? "top-full h-20" : "-top-6 h-6"
        }`}
      />
      <span
        className={`absolute left-1/2 size-4 -translate-x-1/2 rounded-full border-[3px] border-[#f7f5ef] bg-current ${
          isTop ? "top-[calc(100%+72px)]" : "-top-8"
        }`}
      />
      <Link
        className="group block rounded-2xl border border-black/10 bg-white/95 p-4 shadow-[0_12px_35px_rgba(35,35,31,0.08)] transition hover:-translate-y-0.5 hover:border-black/25 focus:outline-none focus:ring-2 focus:ring-blue-500"
        href={`${timelineHref}${timelineHref.includes("?") ? "&" : "?"}initiative=${event.id}`}
      >
        <time className="text-xs font-semibold tracking-wide text-blue-700">
          {event.start}
          {event.end ? ` — ${event.end}` : ""}
        </time>
        <h3 className="mt-2 text-sm font-semibold leading-5">{event.title}</h3>
        <span className="mt-3 inline-block text-xs text-black/45 transition group-hover:text-black/70">
          Open evidence →
        </span>
      </Link>
    </article>
  );
}
