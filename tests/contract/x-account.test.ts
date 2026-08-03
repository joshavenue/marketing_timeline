import { describe, expect, it } from "vitest";

import fixture from "@/../fixtures/x/account-metrics.json";
import { readAccountMetric } from "@/lib/connectors/x/account";

describe("X account analytics", () => {
  it("returns supported public account metrics", () => {
    expect(readAccountMetric(fixture, "followers_count")).toEqual({
      supported: true,
      value: 25000,
    });
    expect(readAccountMetric(fixture, "tweet_count")).toEqual({
      supported: true,
      value: 3400,
    });
  });

  it("reports an unavailable requested metric explicitly", () => {
    expect(readAccountMetric(fixture, "profile_visits")).toEqual({
      supported: false,
      code: "CAPABILITY_UNAVAILABLE",
      message:
        "X did not expose this metric for the configured account and authentication context.",
    });
  });
});
