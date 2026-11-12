import { withOrg } from "@/server/db";
import { requireAccess } from "@/server/access";
import { canSeeActivity } from "./permissions";
import { seatUsage } from "./seats";
import { ALL_APPS } from "./constants";
import { canInvite } from "./invite-rules";
import { flushDueInvites, pendingInviteCount } from "./invites";

/**
 * Everything the Team screens need, from one set of queries, so tiles, tabs, cards and tables always agree (HUB-01).
 * Returns plain objects (dates as ISO strings) that can cross into client components.
 * @param {import("@/server/db").Session} session
 */
export async function getTeam(session) {
  requireAccess(session, { roles: ["OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "MEMBER"] }); // clients never read the team
  const db = withOrg(session);
  if (canInvite(session.role)) await flushDueInvites(session); // emails whose Undo time has passed
  const [rows, org, clients, pendingInvites] = await Promise.all([
    db.membership.findMany({ include: { user: true, appAccess: true }, orderBy: { createdAt: "asc" } }),
    db.organization.get(),
    canInvite(session.role) ? db.client.findMany({ where: { archived: false }, orderBy: { name: "asc" } }) : [],
    pendingInviteCount(session), // the same query the Invites tab uses, so the count always agrees
  ]);

  const nameById = new Map(rows.map((r) => [r.id, r.user.name]));
  const actorIds = rows.map((r) => r.userId);
  const events = await db.auditEvent.findMany({ where: { actorId: { in: actorIds } }, orderBy: { createdAt: "desc" }, take: 200 });
  const activityByUser = new Map();
  for (const e of events) {
    const list = activityByUser.get(e.actorId) ?? [];
    if (list.length < 3) list.push({ id: e.id, summary: e.summary, app: e.app, at: e.createdAt.toISOString() });
    activityByUser.set(e.actorId, list);
  }

  const viewer = { membershipId: session.membershipId, role: session.role };
  const everyone = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.user.name,
    email: r.user.email,
    role: r.role,
    status: r.status.toLowerCase(), // active | invited | inactive
    reportsToId: r.reportsToId,
    reportsToName: r.reportsToId ? nameById.get(r.reportsToId) ?? null : null,
    apps: r.role === "OWNER" ? [...ALL_APPS] : ALL_APPS.filter((a) => r.appAccess.some((x) => x.app === a)),
    lastActiveAt: r.lastActiveAt?.toISOString() ?? null,
    invitedAt: r.invitedAt?.toISOString() ?? null,
    joinedAt: r.joinedAt?.toISOString() ?? null,
    activity: activityByUser.get(r.userId) ?? [],
  }));
  // Recent activity comes from the audit log. It is removed here, on the server, for people the viewer may not see it for.
  const members = everyone.map((m) => (canSeeActivity(viewer, m) ? { ...m, activityVisible: true } : { ...m, activity: [], activityVisible: false }));

  // Seats: one seat per person per app they can open. Client logins are free (07-Data-and-Permissions.md).
  const seatLimit = org.seatLimit;
  const usage = seatUsage(members);
  const appUsage = usage.perApp;
  const seats = { used: usage.people, limit: seatLimit, left: Math.max(seatLimit - usage.people, 0) };

  const needsAttention = [];
  const invited = members.filter((m) => m.status === "invited");
  for (const m of invited) needsAttention.push({ kind: "invite", memberId: m.id, title: `${m.name} hasn't accepted the invite`, detail: "Invite sent", invitedAt: m.invitedAt });
  for (const a of ALL_APPS) {
    const left = seatLimit - appUsage[a];
    if (appUsage[a] > 0 && left <= 3) needsAttention.push({ kind: "seats", app: a, left, title: `${a} has ${left} seats left`, detail: `${seatLimit} seats on your plan, ${appUsage[a]} in use` });
  }
  for (const m of members.filter((x) => x.role === "CLIENT" && x.apps.length === 0)) needsAttention.push({ kind: "client-no-access", memberId: m.id, title: `${m.name} can't open any app`, detail: "Give this client access to a portal app" });

  return { members, seats, appUsage, needsAttention, orgName: org.name, timezone: org.timezone, pendingInvites, clients: clients.map((c) => ({ id: c.id, name: c.name })) };
}
