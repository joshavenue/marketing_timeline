import { db } from "@/db/client";
import { auditEvents } from "@/db/schema";

export interface AuditInput {
  workspaceId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}

export async function appendAudit(event: AuditInput) {
  await db.insert(auditEvents).values({
    workspaceId: event.workspaceId,
    actorUserId: event.actorUserId,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    detailsJson: event.details ?? {},
  });
}
