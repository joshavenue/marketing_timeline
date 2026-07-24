import { describe, expect, it } from "vitest";

import { evaluateRefreshPreflight } from "@/lib/refresh/preflight";

const now = new Date("2026-07-24T12:00:00Z");
const base = {
  connectorKey: "x_post" as const,
  role: "admin" as const,
  now,
  freezeAgeDays: 7,
  costPerOperationMicros: 10,
  hardCapMicros: 100,
  periodUsageMicros: 20,
};

describe("refresh preflight policy", () => {
  it("allows immediately before freeze and blocks at the timestamp", () => {
    const before = evaluateRefreshPreflight({
      ...base,
      objects: [{
        externalObjectId: "before",
        observedAt: new Date(now.getTime() - 7 * 86_400_000 + 1),
      }],
    });
    const frozen = evaluateRefreshPreflight({
      ...base,
      objects: [{
        externalObjectId: "frozen",
        observedAt: new Date(now.getTime() - 7 * 86_400_000),
      }],
    });
    expect(before.eligible).toHaveLength(1);
    expect(frozen.frozen).toHaveLength(1);
  });

  it("lets Notion bypass metric freeze", () => {
    const result = evaluateRefreshPreflight({
      ...base,
      connectorKey: "notion",
      objects: [{
        externalObjectId: "old-notion-page",
        observedAt: new Date("2020-01-01T00:00:00Z"),
      }],
    });
    expect(result.eligible).toHaveLength(1);
    expect(result.frozen).toHaveLength(0);
  });

  it("blocks cost above the remaining cap and non-admin approval", () => {
    const costly = evaluateRefreshPreflight({
      ...base,
      costPerOperationMicros: 81,
      objects: [{ externalObjectId: "post" }],
    });
    const member = evaluateRefreshPreflight({
      ...base,
      role: "member",
      objects: [{ externalObjectId: "post" }],
    });
    expect(costly.canApprove).toBe(false);
    expect(costly.blockers).toContain("Estimated cost exceeds remaining cap");
    expect(member.canApprove).toBe(false);
    expect(member.blockers).toContain("Admin permission is required");
  });
});
