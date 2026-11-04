/** Roles from most to least powerful. Used to compare ranks. */
export const ROLES = ["OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "MEMBER", "CLIENT"];

export class AccessError extends Error {
  constructor(message = "You do not have access to this.") {
    super(message);
    this.name = "AccessError";
    this.status = 403;
  }
}

/**
 * Check role, then app access. Throws AccessError when the person may not continue.
 * @param {import("./db.js").Session | null} session
 * @param {{ app?: string, roles?: string[] }} rule  roles = allowed roles; omit to allow any staff role
 */
export function requireAccess(session, { app, roles } = {}) {
  if (!session || !session.userId || !session.orgId) throw new AccessError("Please sign in.");
  if (session.role === "CLIENT" && !(roles || []).includes("CLIENT")) throw new AccessError();
  if (roles && !roles.includes(session.role)) throw new AccessError();
  // Owners always have every app.
  if (app && session.role !== "OWNER" && !(session.apps || []).includes(app)) throw new AccessError();
  return session;
}
