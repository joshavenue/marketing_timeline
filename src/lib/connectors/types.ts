import type { ConnectorKey } from "@/domain/contracts";

export interface ConnectorReadRequest {
  workspaceId: string;
  connectionId: string;
  operationKey: string;
  externalObjectId: string;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  actorUserId: string;
}

export interface CostEstimate {
  operationCount: number;
  estimatedCostMicros: number;
}

export interface CapabilityResult {
  valid: boolean;
  reason?: string;
}

export interface ConnectorReadResult {
  response: unknown;
  responseHeaders?: Record<string, string>;
  observedAt: Date;
  retryAt?: Date;
  snapshotManaged?: boolean;
}

export interface ReadOnlyConnector {
  key: ConnectorKey;
  estimate(request: ConnectorReadRequest): Promise<CostEstimate>;
  validateCapability(request: ConnectorReadRequest): CapabilityResult;
  read(request: ConnectorReadRequest): Promise<ConnectorReadResult>;
}
