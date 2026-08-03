import Link from "next/link";

import type { TimelineLayoutEvent } from "@/lib/timeline/query";

function withExpandedParent(timelineHref: string, parentId: string) {
  const url = new URL(timelineHref, "http://timeline.local");
  url.searchParams.set("expanded", parentId);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

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
  const isInitiative = event.kind === "initiative";
  const isPlanned = event.status?.toLowerCase() === "planned";
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
      <div
        className={`rounded-[var(--radius-card)] bg-white p-4 shadow-[0_12px_35px_rgba(6,47,51,0.08)] ${
          isPlanned
            ? "border border-dashed border-[var(--color-warning)]"
            : "border border-black/10"
        }`}
      >
        <div className="flex items-center justify-between gap-3 text-xs">
          <span
            className={`font-semibold ${
              isPlanned
                ? "text-[var(--color-warning)]"
                : "text-[var(--color-success)]"
            }`}
          >
            {event.status ?? event.kind}
          </span>
          <time className="text-[var(--color-muted)]">
            {event.start}
            {event.end ? ` — ${event.end}` : ""}
          </time>
        </div>
        <h3 className="mt-2 text-sm font-semibold leading-5">{event.title}</h3>
        <p className="mt-2 text-xs text-[var(--color-evidence)]">
          {event.kind === "initiative"
            ? "Initiative · cited evidence"
            : `${event.kind}${
                event.contributors.length
                  ? ` · ${event.contributors.join(", ")}`
                  : ""
              }`}
        </p>
        {isInitiative ? (
          <div className="mt-3 flex items-center justify-between gap-3 text-xs font-medium">
            <Link
              aria-label={`${event.title} — Open evidence`}
              className="text-[var(--color-evidence)]"
              href={`${timelineHref}${timelineHref.includes("?") ? "&" : "?"}initiative=${event.id}`}
            >
              Open evidence →
            </Link>
            <Link
              aria-label={`Show related events for ${event.title}`}
              className="text-[var(--color-ocean)]"
              href={withExpandedParent(timelineHref, event.id)}
            >
              Related events
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}
