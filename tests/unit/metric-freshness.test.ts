import { describe, expect, it } from "vitest";

import { deriveFreshness } from "@/lib/metrics/freshness";

describe("connection-specific metric freshness", () => {
  const observedAt = new Date("2026-07-01T00:00:00Z");
  const now = new Date("2026-07-09T00:00:00Z");

  it("does not freeze an observation before its 30-day connection limit", () => {
    expect(
      deriveFreshness({
        observedAt,
        frozenAt: null,
        now,
        freezeAgeDays: 30,
        reportedFreshness: "fresh",
      }),
    ).toBe("fresh");
  });

  it("freezes the same observation at its 7-day connection limit", () => {
    expect(
      deriveFreshness({
        observedAt,
        frozenAt: null,
        now,
        freezeAgeDays: 7,
        reportedFreshness: "fresh",
      }),
    ).toBe("frozen");
  });

  it("preserves a source-reported stale state before the freeze limit", () => {
    expect(
      deriveFreshness({
        observedAt,
        frozenAt: null,
        now,
        freezeAgeDays: 30,
        reportedFreshness: "stale",
      }),
    ).toBe("stale");
  });
});
