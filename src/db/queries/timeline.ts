import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { db } from "@/db/client";
import { campaigns, initiatives, timelineEvents } from "@/db/schema";
import type {
  DisplayLevel,
  TimelineKind,
  TimelineWindow,
} from "@/domain/contracts";

export interface TimelineRow {
  id: string;
  externalId: string;
  title: string;
  kind: TimelineKind;
  start: string;
  end: string | null;
  displayLevel: DisplayLevel;
}

function overlapsWindow(
  startColumn: AnyPgColumn,
  endColumn: AnyPgColumn,
  window: TimelineWindow,
) {
  const windowEnd = window.end ?? window.start;
  return and(
    lte(startColumn, windowEnd),
    or(isNull(endColumn), gte(endColumn, window.start)),
  );
}

export async function listTimelineRows(
  workspaceId: string,
  window: TimelineWindow,
): Promise<TimelineRow[]> {
  const [campaignRows, initiativeRows, eventRows] = await Promise.all([
    db
      .select({
        id: campaigns.id,
        externalId: campaigns.externalId,
        title: campaigns.name,
        start: campaigns.startDate,
        end: campaigns.endDate,
        displayLevel: campaigns.displayLevel,
      })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.workspaceId, workspaceId),
          eq(campaigns.publicationStatus, "published"),
          overlapsWindow(campaigns.startDate, campaigns.endDate, window),
        ),
      ),
    db
      .select({
        id: initiatives.id,
        externalId: initiatives.externalId,
        title: initiatives.name,
        start: initiatives.startDate,
        end: initiatives.endDate,
        displayLevel: initiatives.displayLevel,
      })
      .from(initiatives)
      .where(
        and(
          eq(initiatives.workspaceId, workspaceId),
          eq(initiatives.publicationStatus, "published"),
          overlapsWindow(initiatives.startDate, initiatives.endDate, window),
        ),
      ),
    db
      .select({
        id: timelineEvents.id,
        externalId: timelineEvents.externalId,
        title: timelineEvents.title,
        kind: timelineEvents.kind,
        start: timelineEvents.startDate,
        end: timelineEvents.endDate,
        displayLevel: timelineEvents.displayLevel,
      })
      .from(timelineEvents)
      .where(
        and(
          eq(timelineEvents.workspaceId, workspaceId),
          eq(timelineEvents.publicationStatus, "published"),
          overlapsWindow(
            timelineEvents.startDate,
            timelineEvents.endDate,
            window,
          ),
        ),
      ),
  ]);

  return [
    ...campaignRows.map((row) => ({ ...row, kind: "campaign" as const })),
    ...initiativeRows.map((row) => ({
      ...row,
      kind: "initiative" as const,
    })),
    ...eventRows,
  ].sort(
    (left, right) =>
      left.start.localeCompare(right.start) || left.id.localeCompare(right.id),
  );
}
