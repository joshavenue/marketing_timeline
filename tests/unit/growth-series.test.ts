import { describe, expect, it } from "vitest";

import type { GrowthSeriesRows } from "@/db/queries/growth-series";
import { buildGrowthSeriesReadModel } from "@/lib/metrics/growth-series";

function rows(values: Array<{
  id: string;
  start: string;
  end: string;
  value: string;
}>): GrowthSeriesRows {
  return {
    definition: {
      id: "metric-a",
      externalId: "followers",
      name: "Follower count",
      unit: "followers",
      kind: "raw",
      target: "6000",
    },
    freezeAgeDays: 30,
    points: values.map((point) => ({
      id: point.id,
      periodStart: new Date(point.start),
      periodEnd: new Date(point.end),
      value: point.value,
      freshness: "fresh",
      frozenAt: null,
      observedAt: new Date("2026-08-03T00:00:00Z"),
      sourceUrl: `https://analytics.x.com/${point.id}`,
    })),
  };
}

describe("growth series read model", () => {
  it("orders points, preserves citations, and marks a real period gap", () => {
    const model = buildGrowthSeriesReadModel(
      rows([
        {
          id: "later",
          start: "2026-07-15T00:00:00Z",
          end: "2026-07-21T23:59:59Z",
          value: "1200",
        },
        {
          id: "earlier",
          start: "2026-07-01T00:00:00Z",
          end: "2026-07-07T23:59:59Z",
          value: "1000",
        },
      ]),
    );

    expect(model?.points.map((point) => ({
      id: point.id,
      numericValue: point.numericValue,
      hasGapBefore: point.hasGapBefore,
      sourceUrl: point.sourceUrl,
    }))).toEqual([
      {
        id: "earlier",
        numericValue: 1000,
        hasGapBefore: false,
        sourceUrl: "https://analytics.x.com/earlier",
      },
      {
        id: "later",
        numericValue: 1200,
        hasGapBefore: true,
        sourceUrl: "https://analytics.x.com/later",
      },
    ]);
    expect(model).toMatchObject({
      freezeAgeDays: 30,
      latestValue: 1200,
      changePercent: 20,
    });
  });

  it("does not report percentage change from a zero baseline", () => {
    const model = buildGrowthSeriesReadModel(
      rows([
        {
          id: "zero",
          start: "2026-07-01T00:00:00Z",
          end: "2026-07-07T23:59:59Z",
          value: "0",
        },
        {
          id: "later",
          start: "2026-07-08T00:00:00Z",
          end: "2026-07-14T23:59:59Z",
          value: "100",
        },
      ]),
    );

    expect(model?.latestValue).toBe(100);
    expect(model?.changePercent).toBeNull();
  });

  it("returns an empty factual series without manufacturing a reading", () => {
    const model = buildGrowthSeriesReadModel(rows([]));

    expect(model).toMatchObject({
      points: [],
      latestValue: null,
      changePercent: null,
      freezeAgeDays: 30,
    });
  });

  it("returns null when no connected definition is selected", () => {
    expect(buildGrowthSeriesReadModel(null)).toBeNull();
  });
});
