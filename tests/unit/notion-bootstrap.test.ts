import { describe, expect, it } from "vitest";

import { readNotionBootstrapConfig } from "@/lib/notion/bootstrap";

const baseEnv = {
  NOTION_TOKEN: "secret-token",
  NOTION_CAMPAIGNS_DATABASE_ID: "campaigns-db",
  NOTION_INITIATIVES_DATABASE_ID: "initiatives-db",
  NOTION_EVENTS_DATABASE_ID: "events-db",
  NOTION_METRICS_DATABASE_ID: "metrics-db",
  NOTION_OBSERVATIONS_DATABASE_ID: "observations-db",
};

describe("readNotionBootstrapConfig", () => {
  it("maps production environment values to the canonical connection config", () => {
    expect(readNotionBootstrapConfig(baseEnv)).toEqual({
      connectionName: "Marketing HQ",
      token: "secret-token",
      databaseIds: {
        campaigns: "campaigns-db",
        initiatives: "initiatives-db",
        events: "events-db",
        metrics: "metrics-db",
        observations: "observations-db",
      },
    });
  });

  it("rejects an incomplete database mapping", () => {
    expect(() =>
      readNotionBootstrapConfig({
        ...baseEnv,
        NOTION_EVENTS_DATABASE_ID: "",
      }),
    ).toThrow("NOTION_EVENTS_DATABASE_ID is required");
  });
});
