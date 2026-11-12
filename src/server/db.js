import { prisma } from "./prisma.js";

/**
 * @typedef {Object} Session
 * @property {string} userId
 * @property {string} orgId      active organization
 * @property {string} role       OWNER | ADMIN | MANAGER | ACCOUNTANT | MEMBER | CLIENT
 * @property {string[]} apps     apps the person can open, e.g. ["CRM"]
 */

/** Models that carry organizationId. Add every new org-owned model here. */
export const SCOPED_MODELS = ["membership", "appAccess", "client", "project", "invite", "sharedDataSetting"];

/** Append-only models: create and read only. No update, no delete, ever. */
export const APPEND_ONLY_MODELS = ["auditEvent"];

function requireOrg(session) {
  if (!session || !session.orgId) {
    throw new Error("withOrg: a session with an active organization is required");
  }
  return session.orgId;
}

function scopedModel(delegate, organizationId) {
  const scope = (where = {}) => ({ ...where, organizationId });
  return {
    findMany: (args = {}) => delegate.findMany({ ...args, where: scope(args.where) }),
    findFirst: (args = {}) => delegate.findFirst({ ...args, where: scope(args.where) }),
    count: (args = {}) => delegate.count({ ...args, where: scope(args.where) }),
    create: ({ data, ...rest }) => delegate.create({ ...rest, data: { ...data, organizationId } }),
    // Updates and deletes go through *Many with the org filter, so another org's row is never touched.
    updateMany: ({ where, data }) => delegate.updateMany({ where: scope(where), data }),
    deleteMany: ({ where }) => delegate.deleteMany({ where: scope(where) }),
  };
}

function appendOnlyModel(delegate, organizationId) {
  const scope = (where = {}) => ({ ...where, organizationId });
  return {
    findMany: (args = {}) => delegate.findMany({ ...args, where: scope(args.where) }),
    count: (args = {}) => delegate.count({ ...args, where: scope(args.where) }),
    create: ({ data, ...rest }) => delegate.create({ ...rest, data: { ...data, organizationId } }),
  };
}

/**
 * Every database read and write in a route or action goes through this helper.
 * It adds organizationId to every query so one organization can never see another's data.
 * @param {Session} session
 */
export function withOrg(session, client = prisma) {
  const organizationId = requireOrg(session);
  const db = { organizationId };
  for (const name of SCOPED_MODELS) db[name] = scopedModel(client[name], organizationId);
  for (const name of APPEND_ONLY_MODELS) db[name] = appendOnlyModel(client[name], organizationId);
  // The organization row itself: only the session's own organization can be read.
  db.organization = { get: () => client.organization.findUnique({ where: { id: organizationId } }) };
  return db;
}
