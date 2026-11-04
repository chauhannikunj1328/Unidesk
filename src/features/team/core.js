import { withOrg } from "@/server/db";
import { requireAccess, AccessError } from "@/server/access";
import { writeAudit } from "@/server/audit";
import { CLIENT_APPS, appByCode } from "@/lib/apps";
import { POWER_RANK, ROLES } from "./constants";
import { descendantIds } from "./filters";
import { seatUsage } from "./seats";
import { roleLabel } from "@/lib/labels";

/**
 * Team changes. One implementation shared by every theme. Each write is checked for role, scoped to the
 * organization, and writes one plain-language audit event per person.
 * Results are plain objects: { ok: true, ... } or { ok: false, error: "plain words" }.
 */

const fail = (error) => ({ ok: false, error });
const GONE = "This person is no longer in your workspace.";

async function loadTarget(db, membershipId) {
  return db.membership.findFirst({ where: { id: membershipId }, include: { user: true, appAccess: true } });
}

/** Owners and admins edit anyone; managers edit only people who report to them. */
function canEdit(session, target) {
  if (["OWNER", "ADMIN"].includes(session.role)) return true;
  return session.role === "MANAGER" && target.reportsToId === session.membershipId;
}

export async function changeAppAccess(session, { membershipId, app, enabled }) {
  requireAccess(session, { roles: ["OWNER", "ADMIN", "MANAGER"] });
  const db = withOrg(session);
  const target = await loadTarget(db, membershipId);
  if (!target) return fail(GONE);
  if (!canEdit(session, target)) throw new AccessError();
  const appInfo = appByCode(app);
  if (!appInfo) return fail("That app does not exist.");
  if (target.role === "OWNER") return fail("The owner always has every app.");
  if (target.role === "CLIENT" && !CLIENT_APPS.includes(app)) return fail("Not available to clients.");

  const has = target.appAccess.some((a) => a.app === app);
  if (has === enabled) return { ok: true, changed: false };

  if (enabled && target.role !== "CLIENT") {
    const org = await db.organization.get();
    const everyone = await db.membership.findMany({ include: { appAccess: true } });
    const used = seatUsage(everyone.map((m) => ({ role: m.role, status: m.status, apps: m.appAccess.map((a) => a.app) }))).perApp[app];
    if (used >= org.seatLimit) return fail(`No free seat on ${appInfo.label}.`);
  }

  if (enabled) await db.appAccess.create({ data: { membershipId, app } });
  else await db.appAccess.deleteMany({ where: { membershipId, app } });

  await writeAudit(session, {
    action: enabled ? "team.access_given" : "team.access_removed",
    entityType: "membership",
    entityId: membershipId,
    summary: enabled
      ? `${session.name} gave ${target.user.name} access to ${appInfo.label}`
      : `${session.name} removed ${target.user.name}'s access to ${appInfo.label}`,
    meta: { app, enabled },
  });
  return { ok: true, changed: true, name: target.user.name, app: appInfo.label };
}

export async function changeRole(session, { membershipId, role }) {
  requireAccess(session, { roles: ["OWNER", "ADMIN"] });
  if (!ROLES.includes(role)) return fail("That role does not exist.");
  const db = withOrg(session);
  const target = await loadTarget(db, membershipId);
  if (!target) return fail(GONE);
  if (target.role === "OWNER") return fail("Only one owner. Transfer ownership in Settings.");
  if (role === "OWNER") return fail("Only one owner. Transfer ownership in Settings.");
  if (role === "CLIENT") return fail("Changing someone to Client arrives with the client portal.");
  if (target.role === role) return { ok: true, changed: false };

  await db.membership.updateMany({ where: { id: membershipId }, data: { role } });
  await writeAudit(session, {
    action: "team.role_changed",
    entityType: "membership",
    entityId: membershipId,
    summary: `${session.name} changed ${target.user.name}'s role from ${roleLabel(target.role)} to ${roleLabel(role)}`,
    meta: { from: target.role, to: role },
  });
  return { ok: true, changed: true, name: target.user.name, reducesPowers: POWER_RANK[role] > POWER_RANK[target.role] };
}

export async function changeManager(session, { membershipId, reportsToId }) {
  requireAccess(session, { roles: ["OWNER", "ADMIN"] });
  const db = withOrg(session);
  const all = await db.membership.findMany({ include: { user: true } });
  const target = all.find((m) => m.id === membershipId);
  if (!target) return fail(GONE);
  if (target.role === "OWNER") return fail("The owner reports to no one.");
  const boss = all.find((m) => m.id === reportsToId);
  if (!boss || boss.role === "CLIENT" || boss.status === "INACTIVE") return fail("Choose someone from this workspace.");
  if (reportsToId === membershipId) return fail("A person can't report to themselves.");
  const below = descendantIds(all.map((m) => ({ id: m.id, reportsToId: m.reportsToId })), membershipId);
  if (below.has(reportsToId)) return fail(`${boss.user.name} reports to ${target.user.name}, so this would create a loop.`);
  if (target.reportsToId === reportsToId) return { ok: true, changed: false };

  await db.membership.updateMany({ where: { id: membershipId }, data: { reportsToId } });
  await writeAudit(session, {
    action: "team.manager_changed",
    entityType: "membership",
    entityId: membershipId,
    summary: `${session.name} set ${target.user.name} to report to ${boss.user.name}`,
    meta: { reportsToId },
  });
  return { ok: true, changed: true, name: target.user.name };
}

/** Bulk: the same single-person logic per person, one audit event each. Stops nothing on a single failure. */
export async function bulkChange(session, { membershipIds, change }) {
  const results = [];
  for (const membershipId of membershipIds) {
    let r;
    if (change.type === "access") r = await changeAppAccess(session, { membershipId, app: change.app, enabled: change.enabled });
    else if (change.type === "role") r = await changeRole(session, { membershipId, role: change.role });
    else r = await changeManager(session, { membershipId, reportsToId: change.reportsToId });
    results.push({ membershipId, ...r });
  }
  return { ok: results.every((r) => r.ok), results, failed: results.filter((r) => !r.ok).length };
}

