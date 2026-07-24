import { z } from "zod";

import type { ReadOnlyConnector } from "@/lib/connectors/types";
import { createXClient, loadXConnection } from "@/lib/connectors/x/client";

const adsResponse = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      id_data: z.array(
        z.object({
          metrics: z.object({
            impressions: z.array(z.number()).optional(),
            engagements: z.array(z.number()).optional(),
            billed_charge_local_micro: z.array(z.number()).optional(),
          }),
        }),
      ),
    }),
  ),
});

export function normalizeAdsMetrics(input: unknown) {
  const parsed = adsResponse.parse(input);
  const entity = parsed.data[0];
  const metrics = entity?.id_data[0]?.metrics;
  if (!entity || !metrics) throw new Error("X Ads returned no entity metrics");
  const billedChargeLocalMicro = metrics.billed_charge_local_micro?.[0] ?? 0;
  return {
    entityId: entity.id,
    impressions: metrics.impressions?.[0] ?? 0,
    engagements: metrics.engagements?.[0] ?? 0,
    billedChargeLocal: billedChargeLocalMicro / 1_000_000,
    billedChargeLocalMicro,
  };
}

export function validateAdsWindow(start: Date, endExclusive: Date) {
  if (
    start.getUTCMinutes() ||
    start.getUTCSeconds() ||
    start.getUTCMilliseconds() ||
    endExclusive.getUTCMinutes() ||
    endExclusive.getUTCSeconds() ||
    endExclusive.getUTCMilliseconds()
  ) {
    throw new Error("Ads timestamps must use whole-hour boundaries");
  }
  const duration = endExclusive.getTime() - start.getTime();
  if (duration <= 0) throw new Error("Ads end time must be exclusive and after start");
  if (duration > 7 * 86_400_000) throw new Error("Ads range cannot exceed seven days");
}

export const xAdsConnector: ReadOnlyConnector = {
  key: "x_ads",
  async estimate() {
    return { operationCount: 1, estimatedCostMicros: 0 };
  },
  validateCapability(request) {
    if (!request.periodStart || !request.periodEnd) {
      return { valid: false, reason: "An Ads observation window is required" };
    }
    try {
      validateAdsWindow(request.periodStart, request.periodEnd);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: error instanceof Error ? error.message : "Invalid Ads window",
      };
    }
  },
  async read(request) {
    const { credentials, manifest } = await loadXConnection(
      request.workspaceId,
      request.connectionId,
    );
    if (!credentials.userAccessToken || !credentials.adsAccountId) {
      throw new Error("X Ads user authentication and account ID are required");
    }
    validateAdsWindow(request.periodStart!, request.periodEnd!);
    return createXClient({
      manifest,
      token: credentials.userAccessToken,
    }).read({
      operationKey: "x.ads.metrics",
      pathParameters: { accountId: credentials.adsAccountId },
      query: {
        entity: "CAMPAIGN",
        entity_ids: request.externalObjectId,
        metric_groups: "ENGAGEMENT,BILLING",
        start_time: request.periodStart!.toISOString(),
        end_time: request.periodEnd!.toISOString(),
      },
      requestedResponseFields: [
        "data.id",
        "data.id_data.metrics.impressions",
        "data.id_data.metrics.engagements",
        "data.id_data.metrics.billed_charge_local_micro",
      ],
    });
  },
};
