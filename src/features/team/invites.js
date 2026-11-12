import { randomBytes } from "node:crypto";
import { prisma } from "@/server/prisma";
import { withOrg } from "@/server/db";
import { requireAccess, AccessError } from "@/server/access";
import { writeAudit } from "@/server/audit";
import { sendEmail, inviteEmail } from "@/server/email";
import { hashToken } from "@/server/tokens";
import { appUrl } from "@/server/request";
import { formatDate } from "@/lib/dates";
import { appLabel, roleLabel } from "@/lib/labels";
import { ALL_APPS, ROLES } from "./constants";
import { seatUsage } from "./seats";
import {
  INVITE_DAYS, MAX_INVITES, NOTE_MAX, UNDO_SECONDS,
  classifyEmail, effectiveApps, invitableRoles, nameFromEmail, seatCheck, shortSeatsMessage, usesSeats,
} from "./invite-rules";

/**
 * Inviting people (05-team-invite-people.md). One implementation for every theme.
 *
 * Sending is in two steps so that "Undo" really stops the email: createInvites saves the people as Invited, and the
 * email goes out UNDO_SECONDS later (deliverInvites). Undo before then removes them and no email is ever sent.
 * Results are { ok: true, ... } or { ok: false, error: "plain words" }.
 */

const fail = (error) => ({ ok: false, error });
const STAFF = ["OWNER", "ADMIN", "MANAGER"];
const DAY = 24 * 3600 * 1000;

/** A fresh link token. Only its hash is stored. */
const newToken = () => randomBytes(32).toString("base64url");

async function seatsFor(db) {
  const [org, everyone] = await Promise.all([db.organization.get(), db.membership.findMany({ include: { appAccess: true } })]);
  const usage = seatUsage(everyone.map((m) => ({ role: m.role, status: m.status, apps: m.appAccess.map((a) => a.app) })));
  return { org, everyone, appUsage: usage.perApp, seatLimit: org.seatLimit };
}

/**
 * Save the invited people. Nothing is emailed yet.
 * @param {import("@/server/db").Session & { name: string, membershipId: string }} session
 * @param {{ emails: string[], role: string, apps: string[], reportsToId?: string | null, note?: string, clientId?: string | null }} input
 */
export async function createInvites(session, input) {
  requireAccess(session, { roles: STAFF });
  const { role } = input;
  if (!ROLES.includes(role) || !invitableRoles(session.role).includes(role)) {
    if (session.role === "MANAGER") return fail("Managers can invite Members only.");
    throw new AccessError();
  }
  const note = (input.note ?? "").trim();
  if (note.length > NOTE_MAX) return fail(`Keep the note under ${NOTE_MAX} characters.`);

  const db = withOrg(session);
  const { everyone, appUsage, seatLimit } = await seatsFor(db);

  // A manager's invitees always report to that manager.
  const reportsToId = session.role === "MANAGER" ? session.membershipId : input.reportsToId || session.membershipId;
  const boss = everyone.find((m) => m.id === reportsToId);
  if (!boss || boss.role === "CLIENT" || boss.status === "INACTIVE") return fail("Choose someone from this workspace to report to.");

  let clientId = null;
  if (role === "CLIENT" && input.clientId) {
    const client = await db.client.findFirst({ where: { id: input.clientId, archived: false } });
    if (!client) return fail("Choose a client from your list.");
    clientId = client.id;
  }

  // People who are already in the organization are left out, not an error: the drawer already marked them.
  const users = await prisma.user.findMany({ where: { email: { in: input.emails.map((e) => e.toLowerCase()) } }, include: { memberships: { where: { organizationId: session.orgId } } } });
  const existing = new Map();
  for (const u of users) for (const m of u.memberships) existing.set(u.email, m.status.toLowerCase());
  const seen = new Set();
  const skipped = [];
  const emails = [];
  for (const raw of input.emails) {
    const c = classifyEmail(raw, existing);
    if (c.state !== "ok") { skipped.push({ email: c.email, reason: c.message }); continue; }
    if (seen.has(c.email)) continue;
    seen.add(c.email);
    emails.push(c.email);
  }
  if (emails.length === 0) return fail("There is nobody new to invite.");
  if (emails.length > MAX_INVITES) return fail(`Invite up to ${MAX_INVITES} people at a time.`);

  const apps = effectiveApps(role, input.apps);
  if (apps.length === 0 && role !== "CLIENT") return fail("Choose at least one app.");

  const check = seatCheck({ people: emails.length, role, apps, appUsage, seatLimit });
  if (!check.ok) return fail(shortSeatsMessage(check.short));

  const batchId = randomBytes(9).toString("base64url");
  const now = new Date();
  const created = [];
  try {
    await prisma.$transaction(
      async (tx) => {
        const tdb = withOrg(session, tx);
        // Check again inside the transaction: two people inviting at the same moment must not both take the last seat.
        const fresh = await tx.membership.findMany({ where: { organizationId: session.orgId }, include: { appAccess: true } });
        const usage = seatUsage(fresh.map((m) => ({ role: m.role, status: m.status, apps: m.appAccess.map((a) => a.app) }))).perApp;
        if (!seatCheck({ people: emails.length, role, apps, appUsage: usage, seatLimit }).ok) throw new Error("SEATS");

        for (const email of emails) {
          let user = await tx.user.findUnique({ where: { email } });
          const createdUser = !user;
          if (!user) user = await tx.user.create({ data: { email, name: nameFromEmail(email) } });
          const membership = await tdb.membership.create({
            data: { userId: user.id, role, status: "INVITED", reportsToId, invitedById: session.membershipId, invitedAt: now, clientId },
          });
          for (const app of apps) await tdb.appAccess.create({ data: { membershipId: membership.id, app } });
          await tdb.invite.create({
            data: {
              membershipId: membership.id, email, note: note || null, batchId, invitedById: session.membershipId, createdUser,
              expiresAt: new Date(now.getTime() + INVITE_DAYS * DAY), deliverAfter: new Date(now.getTime() + UNDO_SECONDS * 1000),
            },
          });
          created.push({ email, membershipId: membership.id });
        }
      },
      { isolationLevel: "Serializable" }
    );
  } catch (e) {
    if (e?.message === "SEATS") return fail("The last seat was just taken. Check seats and try again.");
    if (e?.code === "P2034" || e?.code === "P2002") return fail("Someone else just changed the team. Try again.");
    throw e;
  }

  const appNames = apps.map(appLabel).join(", ");
  for (const c of created) {
    await writeAudit(session, {
      action: "team.invited",
      entityType: "membership",
      entityId: c.membershipId,
      summary: `${session.name} invited ${c.email} as ${roleLabel(role)}${apps.length ? ` (${appNames})` : ""}`,
      meta: { role, apps, batchId },
    });
  }
  return { ok: true, batchId, invited: created, skipped, undoSeconds: UNDO_SECONDS };
}

/** Sends the email for one invite and makes its link. Returns false if another request already did. */
async function deliverOne(invite, inviterName, orgName, timezone) {
  const raw = newToken();
  const expiresAt = new Date(Date.now() + INVITE_DAYS * DAY);
  const claimed = await prisma.invite.updateMany({
    where: { id: invite.id, status: "PENDING", deliveredAt: null },
    data: { tokenHash: hashToken(raw), expiresAt, deliveredAt: new Date() },
  });
  if (claimed.count !== 1) return false;
  const m = await prisma.membership.findUnique({ where: { id: invite.membershipId }, include: { appAccess: true } });
  const apps = ALL_APPS.filter((a) => m.appAccess.some((x) => x.app === a));
  const link = `${appUrl()}/invite/${raw}`;
  await sendEmail({
    to: invite.email,
    link,
    ...inviteEmail({ inviter: inviterName, org: orgName, role: roleLabel(m.role), apps: apps.map(appLabel), note: invite.note, link, expires: formatDate(expiresAt, timezone) }),
  });
  return true;
}

async function deliverRows(session, rows) {
  if (rows.length === 0) return 0;
  const org = await withOrg(session).organization.get();
  const inviters = await prisma.membership.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.invitedById))] } }, include: { user: true } });
  let sent = 0;
  for (const row of rows) {
    const inviter = inviters.find((i) => i.id === row.invitedById)?.user.name ?? session.name;
    if (await deliverOne(row, inviter, org.name, org.timezone)) sent += 1;
  }
  return sent;
}

/** Sends the emails of one send, once the Undo time has passed. Safe to call twice. */
export async function deliverInvites(session, { batchId }) {
  requireAccess(session, { roles: STAFF });
  const db = withOrg(session);
  const rows = await db.invite.findMany({ where: { batchId, status: "PENDING", deliveredAt: null, deliverAfter: { lte: new Date() } } });
  const sent = await deliverRows(session, rows);
  const waiting = await db.invite.count({ where: { batchId, status: "PENDING", deliveredAt: null } });
  return { ok: true, sent, waiting };
}

/**
 * Sends any emails whose Undo time has passed, for the whole organization. The Team page calls this, so an invite is
 * never stuck unsent if the browser was closed during the Undo time. Never throws: the page must still open.
 */
export async function flushDueInvites(session) {
  try {
    const rows = await withOrg(session).invite.findMany({ where: { status: "PENDING", deliveredAt: null, deliverAfter: { lte: new Date() } } });
    await deliverRows(session, rows);
  } catch (e) {
    console.error("[invites] could not send due invites", e);
  }
}

/** Takes back a send during the Undo time. Anything already emailed stays. */
export async function undoInvites(session, { batchId }) {
  requireAccess(session, { roles: STAFF });
  const db = withOrg(session);
  const rows = await db.invite.findMany({ where: { batchId, status: "PENDING" }, include: { membership: true } });
  const mine = rows.filter((r) => ["OWNER", "ADMIN"].includes(session.role) || r.invitedById === session.membershipId);
  if (rows.length > 0 && mine.length === 0) throw new AccessError();
  let undone = 0;
  let kept = 0;
  for (const row of mine) {
    // Claim it first, so a delivery that runs at the same moment cannot send an email for something being taken back.
    const claimed = await db.invite.updateMany({ where: { id: row.id, status: "PENDING", deliveredAt: null }, data: { status: "REVOKED" } });
    if (claimed.count !== 1) { kept += 1; continue; }
    const userId = row.membership.userId;
    await db.membership.deleteMany({ where: { id: row.membershipId } }); // access rows and the invite go with it
    if (row.createdUser) {
      // Remove the empty account this invite made, unless the person has joined something else since.
      if ((await prisma.membership.count({ where: { userId } })) === 0) await prisma.user.deleteMany({ where: { id: userId, passwordHash: null } });
    }
    await writeAudit(session, { action: "team.invite_undone", entityType: "membership", entityId: row.membershipId, summary: `${session.name} took back the invite to ${row.email}`, meta: { batchId } });
    undone += 1;
  }
  return { ok: true, undone, kept };
}

/** Sends the invite again with a new link and a fresh 7 days. The old link stops working. */
export async function resendInvite(session, { membershipId }) {
  requireAccess(session, { roles: STAFF });
  const db = withOrg(session);
  const target = await db.membership.findFirst({ where: { id: membershipId, status: "INVITED" }, include: { user: true, invite: true } });
  if (!target || !target.invite || target.invite.status !== "PENDING") return fail("This invite is no longer waiting. Refresh the page.");
  const canResend = ["OWNER", "ADMIN"].includes(session.role) || (session.role === "MANAGER" && target.reportsToId === session.membershipId);
  if (!canResend) throw new AccessError();
  if (target.invite.deliveredAt && Date.now() - target.invite.deliveredAt.getTime() < 60_000) return fail("Sent a moment ago. Give it a minute before sending again.");

  // Make it eligible for a fresh delivery: the old link is cleared first, so it stops working at once.
  await db.invite.updateMany({ where: { id: target.invite.id }, data: { tokenHash: null, deliveredAt: null } });
  const org = await db.organization.get();
  const inviter = await prisma.membership.findUnique({ where: { id: target.invite.invitedById }, include: { user: true } });
  const sent = await deliverOne({ ...target.invite, deliveredAt: null }, inviter?.user.name ?? session.name, org.name, org.timezone);
  if (!sent) return fail("Could not send the invite. Try again.");
  await db.membership.updateMany({ where: { id: membershipId }, data: { invitedAt: new Date() } });
  await writeAudit(session, { action: "team.invite_resent", entityType: "membership", entityId: membershipId, summary: `${session.name} resent the invite to ${target.invite.email}` });
  return { ok: true, email: target.invite.email };
}

export { usesSeats };
