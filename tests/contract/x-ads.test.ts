import { describe, expect, it } from "vitest";

import fixture from "@/../fixtures/x/ads-metrics.json";
import {
  normalizeAdsMetrics,
  validateAdsWindow,
} from "@/lib/connectors/x/ads";

describe("X Ads analytics", () => {
  it("preserves requested metrics and converts billed micros exactly", () => {
    expect(normalizeAdsMetrics(fixture)).toEqual({
      entityId: "campaign-1",
      impressions: 12000,
      engagements: 420,
      billedChargeLocal: 12.345678,
      billedChargeLocalMicro: 12345678,
    });
  });

  it("requires whole-hour, exclusive windows of at most seven days", () => {
    expect(() =>
      validateAdsWindow(
        new Date("2026-07-20T00:30:00Z"),
        new Date("2026-07-21T00:00:00Z"),
      ),
    ).toThrow("whole-hour");
    expect(() =>
      validateAdsWindow(
        new Date("2026-07-20T00:00:00Z"),
        new Date("2026-07-27T00:00:00Z"),
      ),
    ).not.toThrow();
    expect(() =>
      validateAdsWindow(
        new Date("2026-07-20T00:00:00Z"),
        new Date("2026-07-27T01:00:00Z"),
      ),
    ).toThrow("seven days");
  });
});
