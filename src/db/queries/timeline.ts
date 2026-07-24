import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { db } from "@/db/client";
import {
  campaigns,
  initiatives,
  timelineEventContributors,
  timelineEvents,
} from "@/db/schema";
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
  campaignId: string | null;
  status: string | null;
  contributors: string[];
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
        campaignId: campaigns.id,
        status: campaigns.lifecycleStatus,
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
        campaignId: initiatives.campaignId,
        status: initiatives.lifecycleStatus,
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
        campaignId: initiatives.campaignId,
        status: initiatives.lifecycleStatus,
      })
      .from(timelineEvents)
      .leftJoin(initiatives, eq(initiatives.id, timelineEvents.initiativeId))
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

  const contributorRows =
    eventRows.length === 0
      ? []
      : await db
          .select({
            eventId: timelineEventContributors.eventId,
            name: timelineEventContributors.contributorName,
          })
          .from(timelineEventContributors)
          .where(
            and(
              eq(timelineEventContributors.workspaceId, workspaceId),
              inArray(
                timelineEventContributors.eventId,
                eventRows.map((row) => row.id),
              ),
            ),
          );
  const contributorsByEvent = new Map<string, string[]>();
  for (const contributor of contributorRows) {
    const current = contributorsByEvent.get(contributor.eventId) ?? [];
    current.push(contributor.name);
    contributorsByEvent.set(contributor.eventId, current);
  }

  return [
    ...campaignRows.map((row) => ({
      ...row,
      kind: "campaign" as const,
      contributors: [],
    })),
    ...initiativeRows.map((row) => ({
      ...row,
      kind: "initiative" as const,
      contributors: [],
    })),
    ...eventRows.map((row) => ({
      ...row,
      contributors: contributorsByEvent.get(row.id) ?? [],
    })),
  ].sort(
    (left, right) =>
      left.start.localeCompare(right.start) || left.id.localeCompare(right.id),
  );
}
