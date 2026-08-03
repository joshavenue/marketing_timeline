import { z } from "zod";

import type { ReadOnlyConnector } from "@/lib/connectors/types";
import { createXClient, loadXConnection } from "@/lib/connectors/x/client";

const metricBag = z.record(z.string(), z.number());
const postResponse = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      public_metrics: metricBag.optional(),
      non_public_metrics: metricBag.optional(),
      organic_metrics: metricBag.optional(),
      promoted_metrics: metricBag.optional(),
    }),
  ),
  meta: z.unknown().optional(),
});

export function normalizePostMetrics(input: unknown) {
  const parsed = postResponse.parse(input);
  const post = parsed.data[0];
  if (!post) throw new Error("X did not return the requested post");
  return {
    postId: post.id,
    metrics: {
      ...(post.public_metrics ? { public: post.public_metrics } : {}),
      ...(post.non_public_metrics
        ? { nonPublic: post.non_public_metrics }
        : {}),
      ...(post.organic_metrics ? { organic: post.organic_metrics } : {}),
      ...(post.promoted_metrics ? { promoted: post.promoted_metrics } : {}),
    },
    meta: parsed.meta,
  };
}

const responseFields = [
  "data.id",
  "data.public_metrics",
  "data.non_public_metrics",
  "data.organic_metrics",
  "data.promoted_metrics",
];

export const xPostConnector: ReadOnlyConnector = {
  key: "x_post",
  async estimate() {
    return { operationCount: 1, estimatedCostMicros: 0 };
  },
  validateCapability(request) {
    return request.externalObjectId
      ? { valid: true }
      : { valid: false, reason: "A post ID is required" };
  },
  async read(request) {
    const { credentials, manifest } = await loadXConnection(
      request.workspaceId,
      request.connectionId,
    );
    if (!credentials.userAccessToken) {
      throw new Error("User-context authentication is required for owned post metrics");
    }
    const client = createXClient({
      manifest,
      token: credentials.userAccessToken,
    });
    const operation = manifest.operations.find(
      (candidate) => candidate.key === "x.post.metrics",
    );
    const allowedMetricFields = [
      ["data.public_metrics", "public_metrics"],
      ["data.non_public_metrics", "non_public_metrics"],
      ["data.organic_metrics", "organic_metrics"],
      ["data.promoted_metrics", "promoted_metrics"],
    ]
      .filter(([responseField]) =>
        operation?.allowedResponseFields.includes(responseField!),
      )
      .map(([, queryField]) => queryField!);
    return client.read({
      operationKey: "x.post.metrics",
      query: {
        ids: request.externalObjectId,
        "tweet.fields": allowedMetricFields.join(","),
      },
      requestedResponseFields: responseFields.filter((field) =>
        operation?.allowedResponseFields.includes(field),
      ),
    });
  },
};
