import type {
  GrowthSeriesPoint,
  GrowthSeriesRows,
} from "@/db/queries/growth-series";

export interface GrowthSeriesDisplayPoint extends GrowthSeriesPoint {
  numericValue: number;
  hasGapBefore: boolean;
}

export interface GrowthSeriesReadModel {
  definition: GrowthSeriesRows["definition"];
  freezeAgeDays: number;
  points: GrowthSeriesDisplayPoint[];
  latestValue: number | null;
  changePercent: number | null;
}

const ONE_DAY_MS = 86_400_000;

export function buildGrowthSeriesReadModel(
  rows: GrowthSeriesRows | null,
): GrowthSeriesReadModel | null {
  if (!rows) return null;

  const ordered = [...rows.points].sort(
    (left, right) =>
      left.periodStart.getTime() - right.periodStart.getTime() ||
      left.id.localeCompare(right.id),
  );
  const points = ordered.map((point, index) => {
    const previous = ordered[index - 1];
    return {
      ...point,
      numericValue: Number(point.value),
      hasGapBefore:
        previous !== undefined &&
        point.periodStart.getTime() - previous.periodEnd.getTime() >
          ONE_DAY_MS,
    };
  });
  const first = points[0]?.numericValue ?? null;
  const latestValue = points.at(-1)?.numericValue ?? null;
  const changePercent =
    first === null || latestValue === null || first === 0
      ? null
      : ((latestValue - first) / Math.abs(first)) * 100;

  return {
    definition: rows.definition,
    freezeAgeDays: rows.freezeAgeDays,
    points,
    latestValue,
    changePercent,
  };
}
