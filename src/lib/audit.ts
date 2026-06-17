import "server-only";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/rate-limit";

export type AuditEvent = {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  detail?: string;
};

// Write an append-only audit record. Never throws into the caller — a failure
// to log must not break the user-facing action.
export async function logAudit(event: AuditEvent): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: event.userId ?? null,
        action: event.action,
        entity: event.entity,
        entityId: event.entityId,
        detail: event.detail,
        ip: clientIp(),
      },
    });
  } catch {
    // Swallow logging errors by design.
  }
}
