import { describe, expect, it } from "vitest";

import {
  layoutTimelineEvents,
  type TimelineLayoutInput,
} from "@/lib/timeline/query";

const rows: TimelineLayoutInput[] = [
  {
    id: "primary",
    parentId: null,
    title: "Primary",
    start: "2026-07-10",
    end: null,
    displayLevel: "primary",
  },
  {
    id: "nested",
    parentId: "primary",
    title: "Nested",
    start: "2026-07-11",
    end: null,
    displayLevel: "nested",
  },
  {
    id: "detail",
    parentId: "primary",
    title: "Detail",
    start: "2026-07-12",
    end: null,
    displayLevel: "detail",
  },
];

describe("historical timeline layout", () => {
  it("keeps primary markers at every zoom and hides detail-only rows", () => {
    for (const zoom of ["year", "quarter", "month", "week"] as const) {
      const laidOut = layoutTimelineEvents(rows, { zoom });
      expect(laidOut.some((row) => row.id === "primary")).toBe(true);
      expect(laidOut.some((row) => row.id === "detail")).toBe(false);
    }
  });

  it("shows nested markers at close zoom or when their parent is expanded", () => {
    expect(
      layoutTimelineEvents(rows, { zoom: "year" }).map((row) => row.id),
    ).not.toContain("nested");
    expect(
      layoutTimelineEvents(rows, { zoom: "month" }).map((row) => row.id),
    ).toContain("nested");
    expect(
      layoutTimelineEvents(rows, {
        zoom: "year",
        expandedParentIds: ["primary"],
      }).map((row) => row.id),
    ).toContain("nested");
  });

  it("assigns stable alternating sides by date and id", () => {
    const ordered = layoutTimelineEvents(
      [
        { ...rows[0]!, id: "b", start: "2026-01-01" },
        { ...rows[0]!, id: "a", start: "2026-01-01" },
        { ...rows[0]!, id: "c", start: "2026-01-02" },
      ],
      { zoom: "year" },
    );

    expect(ordered.map(({ id, side }) => [id, side])).toEqual([
      ["a", "top"],
      ["b", "bottom"],
      ["c", "top"],
    ]);
  });

  it("places a range on its start while retaining the end", () => {
    const [range] = layoutTimelineEvents(
      [
        {
          ...rows[0]!,
          id: "range",
          start: "2026-03-01",
          end: "2026-03-14",
        },
      ],
      { zoom: "quarter" },
    );

    expect(range).toMatchObject({
      markerDate: "2026-03-01",
      end: "2026-03-14",
    });
  });
});
