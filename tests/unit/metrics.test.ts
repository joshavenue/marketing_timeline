import { describe, expect, it } from "vitest";

import { calculateMetric } from "@/lib/metrics/calculate";
import { deriveFreshness } from "@/lib/metrics/freshness";

describe("calculateMetric", () => {
  it("calculates budget variance", () => {
    expect(
      calculateMetric("budget_variance", { actual: 120, planned: 100 }),
    ).toBe(20);
  });

  it("calculates engagement rate", () => {
    expect(
      calculateMetric("engagement_rate", {
        engagements: 25,
        impressions: 1000,
      }),
    ).toBe(0.025);
  });

  it("rejects cost per result with no results", () => {
    expect(() =>
      calculateMetric("cost_per_result", { cost: 20, results: 0 }),
    ).toThrow("results must be greater than zero");
  });
});

describe("deriveFreshness", () => {
  it("lets frozen status win over stale and fresh", () => {
    expect(
      deriveFreshness({
        observedAt: new Date("2026-01-01T00:00:00Z"),
        frozenAt: new Date("2026-01-02T00:00:00Z"),
        now: new Date("2026-07-24T00:00:00Z"),
      }),
    ).toBe("frozen");
  });

  it("marks observations older than seven days stale", () => {
    expect(
      deriveFreshness({
        observedAt: new Date("2026-07-01T00:00:00Z"),
        frozenAt: null,
        now: new Date("2026-07-24T00:00:00Z"),
      }),
    ).toBe("stale");
  });
});
