import { z } from "zod";

import type { ReadOnlyConnector } from "@/lib/connectors/types";
import { createXClient, loadXConnection } from "@/lib/connectors/x/client";

const accountResponse = z.object({
  data: z.object({
    id: z.string(),
    username: z.string().optional(),
    public_metrics: z.record(z.string(), z.number()).optional(),
  }),
});

export function readAccountMetric(input: unknown, metric: string) {
  const parsed = accountResponse.parse(input);
  const value = parsed.data.public_metrics?.[metric];
  return value === undefined
    ? {
        supported: false as const,
        code: "CAPABILITY_UNAVAILABLE" as const,
        message:
          "X did not expose this metric for the configured account and authentication context.",
      }
    : { supported: true as const, value };
}

export const xAccountConnector: ReadOnlyConnector = {
  key: "x_account",
  async estimate() {
    return { operationCount: 1, estimatedCostMicros: 0 };
  },
  validateCapability(request) {
    return request.externalObjectId
      ? { valid: true }
      : { valid: false, reason: "An account ID is required" };
  },
  async read(request) {
    const { credentials, manifest } = await loadXConnection(
      request.workspaceId,
      request.connectionId,
    );
    const token = credentials.userAccessToken ?? credentials.bearerToken;
    if (!token) throw new Error("X account authentication is required");
    return createXClient({ manifest, token }).read({
      operationKey: "x.account.metrics",
      pathParameters: { id: request.externalObjectId },
      query: { "user.fields": "public_metrics" },
      requestedResponseFields: ["data.id", "data.public_metrics"],
    });
  },
};
