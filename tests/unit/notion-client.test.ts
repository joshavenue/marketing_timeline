import { describe, expect, it, vi } from "vitest";

const notionApi = vi.hoisted(() => ({
  retrieveDatabase: vi.fn(),
  queryDataSource: vi.fn(),
}));

vi.mock("@notionhq/client", () => ({
  Client: class {
    databases = { retrieve: notionApi.retrieveDatabase };
    dataSources = { query: notionApi.queryDataSource };
  },
}));

import { readCanonicalNotionPages } from "@/lib/notion/client";

describe("readCanonicalNotionPages", () => {
  it("resolves database IDs to data-source IDs before querying", async () => {
    const databaseIds = {
      campaigns: "campaign-database",
      initiatives: "initiative-database",
      events: "event-database",
      metrics: "metric-database",
      observations: "observation-database",
    };
    notionApi.retrieveDatabase.mockImplementation(async ({ database_id }: { database_id: string }) => ({
      data_sources: [{ id: `${database_id}-source`, name: database_id }],
    }));
    notionApi.queryDataSource.mockResolvedValue({ results: [], has_more: false, next_cursor: null });

    await readCanonicalNotionPages({ token: "test-token", databaseIds });

    expect(notionApi.retrieveDatabase).toHaveBeenCalledTimes(5);
    expect(notionApi.queryDataSource).toHaveBeenCalledTimes(5);
    expect(notionApi.queryDataSource.mock.calls.map(([input]) => input.data_source_id).sort()).toEqual([
      "campaign-database-source",
      "event-database-source",
      "initiative-database-source",
      "metric-database-source",
      "observation-database-source",
    ]);
  });
});
