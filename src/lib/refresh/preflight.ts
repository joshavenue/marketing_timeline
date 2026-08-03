import type { ConnectorKey, WorkspaceRole } from "@/domain/contracts";

export interface RefreshObject {
  externalObjectId: string;
  operationKey?: string;
  observedAt?: Date | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  valid?: boolean;
}

export interface RefreshPreflight {
  eligible: RefreshObject[];
  frozen: RefreshObject[];
  invalid: RefreshObject[];
  operationCount: number;
  estimatedCostMicros: number;
  periodUsageMicros: number;
  remainingCapMicros: number;
  canApprove: boolean;
  blockers: string[];
}

export function evaluateRefreshPreflight(input: {
  connectorKey: ConnectorKey;
  role: WorkspaceRole;
  objects: RefreshObject[];
  now: Date;
  freezeAgeDays: number;
  costPerOperationMicros: number;
  hardCapMicros: number;
  periodUsageMicros: number;
}): RefreshPreflight {
  const invalid = input.objects.filter((object) => object.valid === false);
  const candidates = input.objects.filter((object) => object.valid !== false);
  const freezeMs = input.freezeAgeDays * 86_400_000;
  const frozen =
    input.connectorKey === "notion"
      ? []
      : candidates.filter(
          (object) =>
            object.observedAt &&
            input.now.getTime() - object.observedAt.getTime() >= freezeMs,
        );
  const frozenIds = new Set(frozen.map((object) => object.externalObjectId));
  const eligible = candidates.filter(
    (object) => !frozenIds.has(object.externalObjectId),
  );
  const operationCount = eligible.length;
  const estimatedCostMicros =
    input.connectorKey === "notion"
      ? 0
      : operationCount * input.costPerOperationMicros;
  const remainingCapMicros = Math.max(
    0,
    input.hardCapMicros - input.periodUsageMicros,
  );
  const blockers: string[] = [];
  if (input.role !== "admin") blockers.push("Admin permission is required");
  if (eligible.length === 0) blockers.push("No eligible objects");
  if (estimatedCostMicros > remainingCapMicros) {
    blockers.push("Estimated cost exceeds remaining cap");
  }
  return {
    eligible,
    frozen,
    invalid,
    operationCount,
    estimatedCostMicros,
    periodUsageMicros: input.periodUsageMicros,
    remainingCapMicros,
    canApprove: blockers.length === 0,
    blockers,
  };
}
