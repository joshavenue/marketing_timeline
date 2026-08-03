import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { connections, connectorSkills } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto/secrets";
import {
  parseConnectorManifest,
  type ConnectorManifest,
} from "@/lib/connectors/skills";

const allowedHosts = new Set(["api.x.com", "ads-api.x.com"]);
const preservedHeaders = [
  "x-rate-limit-limit",
  "x-rate-limit-remaining",
  "x-rate-limit-reset",
  "content-type",
];

export class XReadError extends Error {
  retryAt: Date | null;
  status: number;

  constructor(message: string, status: number, retryAt: Date | null) {
    super(message);
    this.name = "XReadError";
    this.status = status;
    this.retryAt = retryAt;
  }
}

export interface XCredentials {
  bearerToken?: string;
  userAccessToken?: string;
  adsAccountId?: string;
}

export function createXClient(input: {
  manifest: ConnectorManifest;
  token: string;
  fetchImpl?: typeof fetch;
}) {
  const fetchImpl = input.fetchImpl ?? fetch;
  return {
    async read(request: {
      operationKey: string;
      pathParameters?: Record<string, string>;
      query: Record<string, string>;
      requestedResponseFields: string[];
    }) {
      const operation = input.manifest.operations.find(
        (candidate) => candidate.key === request.operationKey,
      );
      if (!operation) throw new Error("Operation is not in the active connector manifest");
      if (operation.method !== "GET") throw new Error("Only GET is allowed");
      if (!allowedHosts.has(operation.host)) throw new Error("X host is not allowlisted");
      for (const key of Object.keys(request.query)) {
        if (!operation.allowedQueryParameters.includes(key)) {
          throw new Error(`Query parameter is not allowlisted: ${key}`);
        }
      }
      for (const field of request.requestedResponseFields) {
        if (!operation.allowedResponseFields.includes(field)) {
          throw new Error(`Response field is not allowlisted: ${field}`);
        }
      }
      let path = operation.path;
      for (const [key, value] of Object.entries(request.pathParameters ?? {})) {
        path = path.replace(`:${key}`, encodeURIComponent(value));
      }
      if (path.includes(":")) throw new Error("Missing required path parameter");
      const url = new URL(`https://${operation.host}${path}`);
      for (const [key, value] of Object.entries(request.query)) {
        url.searchParams.set(key, value);
      }
      const response = await fetchImpl(url, {
        method: "GET",
        headers: { authorization: `Bearer ${input.token}` },
      });
      const responseHeaders = Object.fromEntries(
        preservedHeaders
          .map((name) => [name, response.headers.get(name)])
          .filter((entry): entry is [string, string] => entry[1] !== null),
      );
      const body = (await response.json()) as unknown;
      if (!response.ok) {
        const reset = response.headers.get("x-rate-limit-reset");
        const retryAt = reset ? new Date(Number(reset) * 1_000) : null;
        throw new XReadError(`X read failed with status ${response.status}`, response.status, retryAt);
      }
      return {
        response: body,
        responseHeaders,
        observedAt: new Date(),
      };
    },
  };
}

export async function loadXConnection(
  workspaceId: string,
  connectionId: string,
) {
  const [connection] = await db
    .select()
    .from(connections)
    .where(
      and(
        eq(connections.workspaceId, workspaceId),
        eq(connections.id, connectionId),
      ),
    )
    .limit(1);
  if (!connection?.credentialsCiphertext) throw new Error("X credentials are not configured");
  const [skill] = await db
    .select({ markdown: connectorSkills.markdown })
    .from(connectorSkills)
    .where(
      and(
        eq(connectorSkills.workspaceId, workspaceId),
        eq(connectorSkills.apiFamily, "x"),
        eq(connectorSkills.active, true),
      ),
    )
    .limit(1);
  if (!skill) throw new Error("An active X_API.md skill is required");
  let credentials: XCredentials;
  try {
    credentials = JSON.parse(
      decryptSecret(connection.credentialsCiphertext),
    ) as XCredentials;
  } catch {
    throw new Error("X credential payload is invalid");
  }
  return {
    connection,
    credentials,
    manifest: parseConnectorManifest(skill.markdown),
  };
}
