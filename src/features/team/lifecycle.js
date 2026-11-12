import { prisma } from "@/server/prisma";
import { withOrg } from "@/server/db";
import { requireAccess, AccessError } from "@/server/access";
import { writeAudit } from "@/server/audit";
import { sendEmail, ownershipEmail, removedEmail } from "@/server/email";
import { verifyPassword } from "@/server/passwords";
import { isLocked, recordAttempt } from "@/server/rate-limit";
import { appLabel } from "@/lib/labels";
import { ALL_APPS } from "./constants";
import { descendantIds } from "./filters";
import { seatUsage } from "./seats";

/**
 * Stopping someone's access, bringing it back, removing someone with a hand-over, and moving ownership (Hub flow 10).
 * One implementation for every theme. Results are { ok: true, ... } or { ok: false, error: "plain words" }.
 *   Deactivated (INACTIVE): cannot sign in, stays listed, can be reactivated. Their work stays as it is.
 *   Removed (REMOVED): leaves the team list and pickers, keeps their name in history, can be invited again.
 * Signing in is checked against the database on every request, so both take effect on the person's next click.
 */

const fail = (error) => ({ ok: false, error });
const ADMINS = ["OWNER", "ADMIN"];
export const REMOVE_WORD = "REMOVE";

async function loadTarget(db, membershipId, statuses) {
  const target = await db.membership.findFirst({ where: { id: membershipId, status: { in: statuses } }, include: { user: true, appAccess: true } });
  return target;
}

/** The rules every one of these actions shares: not the owner, not yourself. Returns an error message or null. */
function guard(session, target, verb) {
  if (target.role === "OWNER") return `The owner can't be ${verb}. Transfer ownership first.`;
  if (target.id === session.membershipId) return verb === "removed" ? "You can't remove yourself. Leave the organization from your profile." : "You can't deactivate yourself.";
  return null;
}

export async function deactivateMember(session, { membershipId }) {
  requireAccess(session, { roles: ADMINS });
  const db = withOrg(session);
  const target = await loadTarget(db, membershipId, ["ACTIVE"]);
  if (!target) return fail("This person is no longer active. Refresh the page.");
  const problem = guard(session, target, "deactivated");
  if (problem) return fail(problem);
  await db.membership.updateMany({ where: { id: membershipId }, data: { status: "INACTIVE" } });
  await writeAudit(session, { action: "team.deactivated", entityType: "membership", entityId: membershipId, summary: `${session.name} deactivated ${target.user.name}` });
  return { ok: true, name: target.user.name };
}

export async function reactivateMember(session, { membershipId }) {
  requireAccess(session, { roles: ADMINS });
  const db = withOrg(session);
  const target = await loadTarget(db, membershipId, ["INACTIVE"]);
  if (!target) return fail("This person is not deactivated. Refresh the page.");
  if (target.role !== "CLIENT") {
    const [org, everyone] = await Promise.all([db.organization.get(), db.membership.findMany({ include: { appAccess: true } })]);
    const used = seatUsage(everyone.map((m) => ({ role: m.role, status: m.status, apps: m.appAccess.map((a) => a.app) }))).perApp;
    const short = target.appAccess.find((a) => used[a.app] >= org.seatLimit);
    if (short) return fail(`There is no free ${appLabel(short.app)} seat. Free a seat or turn that app off for ${target.user.name} first.`);
  }
  await db.membership.updateMany({ where: { id: membershipId }, data: { status: "ACTIVE" } });
  await writeAudit(session, { action: "team.reactivated", entityType: "membership", entityId: membershipId, summary: `${session.name} reactivated ${target.user.name}` });
  return { ok: true, name: target.user.name };
}

/** Deactivate several people. Each one is checked on its own; one failure does not stop the rest. */
export async function deactivateMembers(session, { membershipIds }) {
  const results = [];
  for (const membershipId of membershipIds) results.push({ membershipId, ...(await deactivateMember(session, { membershipId })) });
  return { ok: results.every((r) => r.ok), results, done: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length };
}

/**
 * Removes someone, handing over what they own in the same step. All or nothing.
 * Today that is the clients they own and the people who report to them; tasks, bookings and reports join when those apps exist.
 * @param {{ membershipId: string, clientsTo?: string, reportsTo?: string, confirm: string }} input
 */
export async function removeMember(session, { membershipId, clientsTo, reportsTo, confirm }) {
  requireAccess(session, { roles: ADMINS });
  const db = withOrg(session);
  const target = await loadTarget(db, membershipId, ["ACTIVE", "INACTIVE"]);
  if (!target) return fail("This person is no longer in your workspace. Refresh the page.");
  const problem = guard(session, target, "removed");
  if (problem) return fail(problem);
  if (confirm !== REMOVE_WORD) return fail(`Type ${REMOVE_WORD} to confirm.`);

  const [clients, reports, everyone] = await Promise.all([
    db.client.findMany({ where: { ownerId: membershipId } }),
    db.membership.findMany({ where: { reportsToId: membershipId, status: { not: "REMOVED" } }, include: { user: true } }),
    db.membership.findMany({ where: { status: { not: "REMOVED" } }, include: { user: true } }),
  ]);
  const pick = (id) => everyone.find((m) => m.id === id && m.id !== membershipId && m.status === "ACTIVE" && m.role !== "CLIENT");
  const clientHeir = clients.length ? pick(clientsTo) : null;
  if (clients.length && !clientHeir) return fail(`Choose who takes over ${clients.length === 1 ? "the client" : `the ${clients.length} clients`}.`);
  const manager = reports.length ? pick(reportsTo) : null;
  if (reports.length && !manager) return fail(`Choose a new manager for ${reports.length === 1 ? reports[0].user.name : `the ${reports.length} people who report to ${target.user.name}`}.`);
  if (manager && descendantIds(everyone.map((m) => ({ id: m.id, reportsToId: m.reportsToId })), membershipId).has(manager.id)) {
    return fail(`${manager.user.name} reports to ${target.user.name}, so they can't become the new manager. Choose someone else.`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const tdb = withOrg(session, tx);
      if (clientHeir) await tdb.client.updateMany({ where: { ownerId: membershipId }, data: { ownerId: clientHeir.id } });
      if (manager) await tdb.membership.updateMany({ where: { reportsToId: membershipId }, data: { reportsToId: manager.id } });
      await tdb.appAccess.deleteMany({ where: { membershipId } });
      await tdb.membership.updateMany({ where: { id: membershipId }, data: { status: "REMOVED", removedAt: new Date(), reportsToId: null } });
    });
  } catch (e) {
    console.error("[team] removal rolled back", e);
    return fail(`Couldn't remove ${target.user.name}. Nothing was changed. Try again.`);
  }

  const parts = [];
  if (clientHeir) parts.push(`moved ${clients.length} ${clients.length === 1 ? "client" : "clients"} to ${clientHeir.user.name}`);
  if (manager) parts.push(`${reports.length} ${reports.length === 1 ? "person now reports" : "people now report"} to ${manager.user.name}`);
  await writeAudit(session, {
    action: "team.removed", entityType: "membership", entityId: membershipId,
    summary: `${session.name} removed ${target.user.name}${parts.length ? ` and ${parts.join("; ")}` : ""}`,
    meta: { clients: clients.length, reports: reports.length },
  });
  const org = await db.organization.get();
  await sendEmail({ to: target.user.email, ...removedEmail({ name: target.user.name.split(" ")[0], org: org.name, by: session.name }) });
  return { ok: true, name: target.user.name, movedClients: clientHeir ? clients.length : 0, movedReports: manager ? reports.length : 0, clientsTo: clientHeir?.user.name ?? null, reportsTo: manager?.user.name ?? null };
}

/**
 * The owner hands ownership to an Admin. Needs the owner's password again. The old owner becomes an Admin who keeps every app.
 * @param {{ toMembershipId: string, password: string }} input
 * @param {string} [ipHash] for the same sign-in attempt limit as the sign-in page
 */
export async function transferOwnership(session, { toMembershipId, password }, ipHash = "internal") {
  requireAccess(session, { roles: ["OWNER"] });
  const db = withOrg(session);
  const target = await loadTarget(db, toMembershipId, ["ACTIVE"]);
  if (!target || target.role !== "ADMIN") return fail("Ownership can only go to an active Admin.");
  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  if (await isLocked(me.email, ipHash)) return fail("Too many attempts. Try again in 15 minutes.");
  if (!(await verifyPassword(String(password ?? ""), me.passwordHash))) {
    await recordAttempt(me.email, ipHash, false);
    return fail("That password isn't right.");
  }
  try {
    await prisma.$transaction(async (tx) => {
      const tdb = withOrg(session, tx);
      // The old owner keeps every app as an Admin (the owner had them implicitly, so make them real rows).
      const have = new Set((await tdb.appAccess.findMany({ where: { membershipId: session.membershipId } })).map((a) => a.app));
      for (const app of ALL_APPS) if (!have.has(app)) await tdb.appAccess.create({ data: { membershipId: session.membershipId, app } });
      await tdb.membership.updateMany({ where: { id: toMembershipId }, data: { role: "OWNER", reportsToId: null } });
      await tdb.membership.updateMany({ where: { id: session.membershipId }, data: { role: "ADMIN", reportsToId: toMembershipId } });
    });
  } catch (e) {
    console.error("[team] ownership transfer rolled back", e);
    return fail("Couldn't transfer ownership. Nothing was changed. Try again.");
  }
  await writeAudit(session, { action: "team.ownership_transferred", entityType: "membership", entityId: toMembershipId, summary: `${session.name} transferred ownership to ${target.user.name}` });
  const org = await db.organization.get();
  await sendEmail({ to: target.user.email, ...ownershipEmail({ name: target.user.name.split(" ")[0], org: org.name, from: session.name, to: target.user.name, role: "new" }) });
  await sendEmail({ to: me.email, ...ownershipEmail({ name: me.name.split(" ")[0], org: org.name, from: session.name, to: target.user.name, role: "old" }) });
  return { ok: true, newOwner: target.user.name };
}

export { AccessError };
