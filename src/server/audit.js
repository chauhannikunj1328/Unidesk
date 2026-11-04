import { withOrg } from "./db.js";

/**
 * Append one audit event. This is the only way to write to the audit log.
 * `action` is an internal code (mapped to a label in src/lib/labels.js); `summary` is plain words for people.
 * @param {import("./db.js").Session} session
 * @param {{ app?: string, action: string, entityType?: string, entityId?: string, summary: string, meta?: object }} event
 */
export function writeAudit(session, event) {
  return withOrg(session).auditEvent.create({
    data: {
      actorId: session.userId,
      app: event.app ?? "hub",
      action: event.action,
      entityType: event.entityType ?? null,
      entityId: event.entityId ?? null,
      summary: event.summary,
      meta: event.meta ?? undefined,
    },
  });
}
