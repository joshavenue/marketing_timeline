import type { ConnectorKey } from "@/domain/contracts";
import type { ReadOnlyConnector } from "@/lib/connectors/types";
import { syncNotionWorkspace } from "@/lib/notion/sync";

const connectors = new Map<ConnectorKey, ReadOnlyConnector>();

export function registerConnector(connector: ReadOnlyConnector) {
  connectors.set(connector.key, connector);
}

export function getConnector(key: ConnectorKey) {
  const connector = connectors.get(key);
  if (!connector) throw new Error(`Connector is not registered: ${key}`);
  return connector;
}

registerConnector({
  key: "notion",
  async estimate() {
    return { operationCount: 1, estimatedCostMicros: 0 };
  },
  validateCapability() {
    return { valid: true };
  },
  async read(request) {
    const response = await syncNotionWorkspace({
      workspaceId: request.workspaceId,
      connectionId: request.connectionId,
      actorUserId: request.actorUserId,
    });
    return { response, observedAt: new Date(), snapshotManaged: true };
  },
});
