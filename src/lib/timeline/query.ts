import type { DisplayLevel } from "@/domain/contracts";
import { listTimelineRows } from "@/db/queries/timeline";

export type TimelineZoom = "year" | "quarter" | "month" | "week";
export type TimelineSide = "top" | "bottom";

export interface TimelineLayoutInput {
  id: string;
  parentId: string | null;
  title: string;
  start: string;
  end: string | null;
  displayLevel: DisplayLevel;
}

export interface TimelineLayoutEvent extends TimelineLayoutInput {
  markerDate: string;
  side: TimelineSide;
}

export interface TimelineQuery {
  workspaceId: string;
  start: string;
  end: string;
  zoom: TimelineZoom;
  campaignIds?: string[];
  statuses?: string[];
  contributors?: string[];
  query?: string;
  expandedParentIds?: string[];
}

export interface TimelineReadModel {
  start: string;
  end: string;
  zoom: TimelineZoom;
  events: TimelineLayoutEvent[];
}

export function layoutTimelineEvents(
  rows: TimelineLayoutInput[],
  options: {
    zoom: TimelineZoom;
    expandedParentIds?: string[];
  },
): TimelineLayoutEvent[] {
  const expanded = new Set(options.expandedParentIds ?? []);
  return rows
    .filter((row) => {
      if (row.displayLevel === "detail") return false;
      if (row.displayLevel === "primary") return true;
      return (
        options.zoom === "month" ||
        options.zoom === "week" ||
        (row.parentId !== null && expanded.has(row.parentId))
      );
    })
    .sort(
      (left, right) =>
        left.start.localeCompare(right.start) || left.id.localeCompare(right.id),
    )
    .map((row, index) => ({
      ...row,
      markerDate: row.start,
      side: index % 2 === 0 ? "top" : "bottom",
    }));
}

export async function getTimelineWindow(
  input: TimelineQuery,
): Promise<TimelineReadModel> {
  const cachedRows = await listTimelineRows(input.workspaceId, {
    start: input.start,
    end: input.end,
  });
  const query = input.query?.trim().toLowerCase();
  const filtered = cachedRows.filter((row) => {
    if (
      input.campaignIds?.length &&
      (!row.campaignId || !input.campaignIds.includes(row.campaignId))
    ) {
      return false;
    }
    if (
      input.statuses?.length &&
      (!row.status || !input.statuses.includes(row.status))
    ) {
      return false;
    }
    if (
      input.contributors?.length &&
      !row.contributors.some((name) => input.contributors!.includes(name))
    ) {
      return false;
    }
    if (query && !row.title.toLowerCase().includes(query)) return false;
    return true;
  });

  return {
    start: input.start,
    end: input.end,
    zoom: input.zoom,
    events: layoutTimelineEvents(
      filtered.map((row) => ({
        id: row.id,
        parentId: null,
        title: row.title,
        start: row.start,
        end: row.end,
        displayLevel: row.displayLevel,
      })),
      { zoom: input.zoom, expandedParentIds: input.expandedParentIds },
    ),
  };
}
