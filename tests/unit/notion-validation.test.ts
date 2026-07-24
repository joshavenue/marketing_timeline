import { describe, expect, it } from "vitest";

import validFixture from "@/../fixtures/notion/published-valid.json";
import invalidFixture from "@/../fixtures/notion/published-invalid.json";
import { validateCanonicalPage } from "@/lib/notion/validate";

describe("canonical Notion validation", () => {
  it("accepts a complete published record and preserves lifecycle status", () => {
    const result = validateCanonicalPage(validFixture);

    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.record.lifecycleStatus).toBe("In progress");
      expect(result.record.publicationStatus).toBe("published");
    }
  });

  it("skips a draft instead of reporting it invalid", () => {
    const result = validateCanonicalPage({
      ...validFixture,
      publicationStatus: "Draft",
      campaignExternalId: undefined,
    });

    expect(result).toMatchObject({ status: "skipped" });
  });

  it("reports missing parent, invalid range, and display level", () => {
    const result = validateCanonicalPage(invalidFixture);

    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.join(" ")).toMatch(/campaignExternalId/);
      expect(result.errors.join(" ")).toMatch(/date range/);
      expect(result.errors.join(" ")).toMatch(/displayLevel/);
    }
  });

  it("accepts arbitrary non-empty Notion lifecycle labels", () => {
    const result = validateCanonicalPage({
      ...validFixture,
      lifecycleStatus: "Waiting on a very specific partner",
    });

    expect(result.status).toBe("valid");
  });
});
