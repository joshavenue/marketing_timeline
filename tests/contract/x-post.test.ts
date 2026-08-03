import { describe, expect, it } from "vitest";

import fixture from "@/../fixtures/x/post-metrics.json";
import rateLimit from "@/../fixtures/x/rate-limit.json";
import {
  createXClient,
  XReadError,
} from "@/lib/connectors/x/client";
import { normalizePostMetrics } from "@/lib/connectors/x/post";
import type { ConnectorManifest } from "@/lib/connectors/skills";

const manifest: ConnectorManifest = {
  apiFamily: "x",
  version: 1,
  operations: [{
    key: "x.post.metrics",
    method: "GET",
    host: "api.x.com",
    path: "/2/tweets",
    allowedQueryParameters: ["ids", "tweet.fields"],
    allowedResponseFields: ["data.id", "data.public_metrics"],
  }],
};

describe("X post metrics", () => {
  it("keeps each available owned-post metric context separate", () => {
    expect(normalizePostMetrics(fixture).metrics).toEqual({
      public: fixture.data[0]!.public_metrics,
      nonPublic: fixture.data[0]!.non_public_metrics,
      organic: fixture.data[0]!.organic_metrics,
      promoted: fixture.data[0]!.promoted_metrics,
    });
  });

  it("allows only the manifest host, GET operation, parameters, and fields", async () => {
    let observedMethod = "";
    const client = createXClient({
      manifest,
      token: "redacted",
      fetchImpl: async (_url, init) => {
        observedMethod = init?.method ?? "";
        return new Response(JSON.stringify(fixture), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "x-rate-limit-remaining": "74",
          },
        });
      },
    });
    const result = await client.read({
      operationKey: "x.post.metrics",
      query: { ids: "1840000000000000000" },
      requestedResponseFields: ["data.public_metrics"],
    });
    expect(observedMethod).toBe("GET");
    expect(result.responseHeaders["x-rate-limit-remaining"]).toBe("74");
    await expect(client.read({
      operationKey: "x.post.metrics",
      query: { arbitrary: "https://evil.example" },
      requestedResponseFields: ["data.public_metrics"],
    })).rejects.toThrow("Query parameter is not allowlisted");
    await expect(client.read({
      operationKey: "x.post.metrics",
      query: { ids: "1" },
      requestedResponseFields: ["data.secret"],
    })).rejects.toThrow("Response field is not allowlisted");
    const wrongHost = structuredClone(manifest);
    wrongHost.operations[0]!.host = "evil.example";
    await expect(createXClient({
      manifest: wrongHost,
      token: "redacted",
      fetchImpl: async () => new Response("{}"),
    }).read({
      operationKey: "x.post.metrics",
      query: { ids: "1" },
      requestedResponseFields: ["data.public_metrics"],
    })).rejects.toThrow("X host is not allowlisted");
  });

  it("preserves rate-limit retry timing without retrying", async () => {
    let calls = 0;
    const client = createXClient({
      manifest,
      token: "redacted",
      fetchImpl: async () => {
        calls += 1;
        return new Response(JSON.stringify(rateLimit.body), {
          status: rateLimit.status,
          headers: rateLimit.headers,
        });
      },
    });
    const error = await client.read({
      operationKey: "x.post.metrics",
      query: { ids: "1" },
      requestedResponseFields: ["data.public_metrics"],
    }).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(XReadError);
    expect((error as XReadError).retryAt?.getTime()).toBe(
      Number(rateLimit.headers["x-rate-limit-reset"]) * 1_000,
    );
    expect(calls).toBe(1);
  });
});
