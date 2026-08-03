import type { DisplayLevel, TimelineKind } from "@/domain/contracts";
import { listTimelineRows } from "@/db/queries/timeline";
import {
  listGrowthSeries,
  listGrowthSeriesOptions,
  type GrowthSeriesOption,
} from "@/db/queries/growth-series";
import {
  buildGrowthSeriesReadModel,
  type GrowthSeriesReadModel,
} from "@/lib/metrics/growth-series";

export type TimelineZoom = "year" | "quarter" | "month" | "week";
export type TimelineSide = "top" | "bottom";

export interface TimelineLayoutInput {
  id: string;
  parentId: string | null;
  kind: TimelineKind;
  status: string | null;
  contributors: string[];
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
  metricDefinitionId?: string;
}

export interface TimelineReadModel {
  start: string;
  end: string;
  zoom: TimelineZoom;
  events: TimelineLayoutEvent[];
  growthOptions: GrowthSeriesOption[];
  growthSeries: GrowthSeriesReadModel | null;
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
  const [cachedRows, growthOptions] = await Promise.all([
    listTimelineRows(input.workspaceId, {
      start: input.start,
      end: input.end,
    }),
    listGrowthSeriesOptions(input.workspaceId),
  ]);
  const selectedMetricDefinitionId =
    input.metricDefinitionId ?? growthOptions[0]?.id;
  const growthRows = selectedMetricDefinitionId
    ? await listGrowthSeries({
        workspaceId: input.workspaceId,
        metricDefinitionId: selectedMetricDefinitionId,
        start: input.start,
        end: input.end,
      })
    : null;
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
    growthOptions,
    growthSeries: buildGrowthSeriesReadModel(growthRows),
    events: layoutTimelineEvents(
      filtered.map((row) => ({
        id: row.id,
        parentId: row.parentId,
        kind: row.kind,
        status: row.status,
        contributors: row.contributors,
        title: row.title,
        start: row.start,
        end: row.end,
        displayLevel: row.displayLevel,
      })),
      { zoom: input.zoom, expandedParentIds: input.expandedParentIds },
    ),
  };
}
