import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/prisma";
import { AccessError } from "@/server/access";
import { hashPassword } from "@/server/passwords";
import { deactivateMember, deactivateMembers, reactivateMember, removeMember, transferOwnership } from "@/features/team/lifecycle";
import { createInvites } from "@/features/team/invites";
import { getTeam } from "@/features/team/queries";
import { loadValidUser } from "@/server/session-check";
import { seatUsage } from "@/features/team/seats";

let A, B, P = {}, S = {};
const stamp = Date.now();
const PASS = "owner-test-pass-2026";
const mail = (k) => `${k}-${stamp}@test.example`;

async function mk(org, key, role, { apps = [], reportsToId = null, status = "ACTIVE", password } = {}) {
  const user = await prisma.user.create({ data: { email: mail(key), name: key, passwordHash: password ? await hashPassword(password) : null, emailVerifiedAt: new Date() } });
  const m = await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role, status, reportsToId } });
  for (const app of apps) await prisma.appAccess.create({ data: { membershipId: m.id, organizationId: org.id, app } });
  return { user, m };
}
const sess = (org, p, role) => ({ userId: p.user.id, name: p.user.name, orgId: org.id, role, membershipId: p.m.id, apps: [] });
const person = async (key, role = "MEMBER", extra = {}) => mk(A, key, role, extra);
const status = async (p) => (await prisma.membership.findUnique({ where: { id: p.m.id } })).status;
const audit = (org, action) => prisma.auditEvent.findMany({ where: { organizationId: org.id, action }, orderBy: { createdAt: "desc" } });
const client = (name, ownerId) => prisma.client.create({ data: { organizationId: A.id, name: `${name}-${stamp}`, ownerId } });

beforeAll(async () => {
  A = await prisma.organization.create({ data: { name: `Life A ${stamp}`, seatLimit: 6 } });
  B = await prisma.organization.create({ data: { name: `Life B ${stamp}`, seatLimit: 6 } });
  P.owner = await mk(A, "lowner", "OWNER", { password: PASS });
  P.admin = await mk(A, "ladmin", "ADMIN", { apps: ["CRM"], reportsToId: P.owner.m.id });
  P.admin2 = await mk(A, "ladmin2", "ADMIN", { apps: ["CRM"], reportsToId: P.owner.m.id });
  P.mgr = await mk(A, "lmgr", "MANAGER", { apps: ["CRM"], reportsToId: P.admin.m.id });
  P.bOwner = await mk(B, "lbowner", "OWNER");
  S = { owner: sess(A, P.owner, "OWNER"), admin: sess(A, P.admin, "ADMIN"), mgr: sess(A, P.mgr, "MANAGER"), bOwner: sess(B, P.bOwner, "OWNER") };
});
afterAll(async () => {
  await prisma.auditEvent.deleteMany({ where: { organizationId: { in: [A.id, B.id] } } });
  await prisma.organization.deleteMany({ where: { id: { in: [A.id, B.id] } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${stamp}@test.example` } } });
  await prisma.emailLog.deleteMany({ where: { to: { endsWith: `-${stamp}@test.example` } } });
  await prisma.loginAttempt.deleteMany({ where: { email: { endsWith: `-${stamp}@test.example` } } });
  await prisma.$disconnect();
});

describe("deactivate and reactivate", () => {
  it("deactivating stops access at once, frees the seat, keeps the person listed and writes a plain event", async () => {
    const p = await person("d1", "MEMBER", { apps: ["CRM"], reportsToId: P.mgr.m.id });
    const before = (await prisma.membership.findMany({ where: { organizationId: A.id }, include: { appAccess: true } }));
    const used = (rows) => seatUsage(rows.map((m) => ({ role: m.role, status: m.status, apps: m.appAccess.map((a) => a.app) }))).perApp.CRM;
    const n = used(before);
    expect(await deactivateMember(S.admin, { membershipId: p.m.id })).toMatchObject({ ok: true, name: "d1" });
    expect(await status(p)).toBe("INACTIVE");
    expect(used(await prisma.membership.findMany({ where: { organizationId: A.id }, include: { appAccess: true } }))).toBe(n - 1);
    expect((await audit(A, "team.deactivated"))[0].summary).toBe("ladmin deactivated d1");
    expect((await getTeam(S.owner)).members.find((m) => m.id === p.m.id)).toMatchObject({ status: "inactive", apps: ["CRM"] }); // still listed, role and apps kept
    // The next request after deactivation: a person with no active membership anywhere has no valid session.
    expect(await loadValidUser({ userId: p.user.id })).toBeNull();
  });

  it("reactivating brings back the same role and apps, and needs a free seat", async () => {
    const p = await person("d2", "MEMBER", { apps: ["CRM"] });
    await deactivateMember(S.owner, { membershipId: p.m.id });
    expect(await reactivateMember(S.admin, { membershipId: p.m.id })).toMatchObject({ ok: true });
    const back = await prisma.membership.findUnique({ where: { id: p.m.id }, include: { appAccess: true } });
    expect(back).toMatchObject({ status: "ACTIVE", role: "MEMBER" });
    expect(back.appAccess.map((a) => a.app)).toEqual(["CRM"]);
    expect((await audit(A, "team.reactivated"))[0].summary).toBe("ladmin reactivated d2");

    await deactivateMember(S.owner, { membershipId: p.m.id });
    await prisma.organization.update({ where: { id: A.id }, data: { seatLimit: 4 } }); // owner, admin, admin2, mgr already use CRM
    const r = await reactivateMember(S.owner, { membershipId: p.m.id });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no free CRM seat/i);
    expect(await status(p)).toBe("INACTIVE");
    await prisma.organization.update({ where: { id: A.id }, data: { seatLimit: 6 } });
    await reactivateMember(S.owner, { membershipId: p.m.id });
  });

  it("never the owner, never yourself, only owners and admins", async () => {
    expect((await deactivateMember(S.admin, { membershipId: P.owner.m.id })).error).toMatch(/owner can't be deactivated/);
    expect((await deactivateMember(S.admin, { membershipId: P.admin.m.id })).error).toMatch(/can't deactivate yourself/);
    await expect(deactivateMember(S.mgr, { membershipId: P.admin2.m.id })).rejects.toBeInstanceOf(AccessError);
    await expect(reactivateMember(S.mgr, { membershipId: P.admin2.m.id })).rejects.toBeInstanceOf(AccessError);
    expect(await status(P.owner)).toBe("ACTIVE");
  });

  it("bulk deactivate reports each person", async () => {
    const x = await person("b1"); const y = await person("b2");
    const r = await deactivateMembers(S.admin, { membershipIds: [x.m.id, P.owner.m.id, y.m.id] });
    expect(r).toMatchObject({ done: 2, failed: 1 });
    expect(await status(x)).toBe("INACTIVE");
    expect(await status(P.owner)).toBe("ACTIVE");
  });
});

describe("remove", () => {
  it("hands clients and reports over in one step, removes access, emails the person and writes the audit event", async () => {
    const sumit = await person("r1", "MEMBER", { apps: ["CRM"], reportsToId: P.mgr.m.id });
    const junior = await person("r1junior", "MEMBER", { apps: ["CRM"], reportsToId: sumit.m.id });
    const c1 = await client("c1", sumit.m.id); const c2 = await client("c2", sumit.m.id);
    expect((await removeMember(S.admin, { membershipId: sumit.m.id, confirm: "remove" })).error).toBe("Type REMOVE to confirm.");
    expect((await removeMember(S.admin, { membershipId: sumit.m.id, confirm: "REMOVE" })).error).toMatch(/Choose who takes over the 2 clients/);
    expect((await removeMember(S.admin, { membershipId: sumit.m.id, clientsTo: P.mgr.m.id, confirm: "REMOVE" })).error).toMatch(/Choose a new manager for r1junior/);
    expect(await status(sumit)).toBe("ACTIVE"); // nothing changed by the refusals

    const r = await removeMember(S.admin, { membershipId: sumit.m.id, clientsTo: P.mgr.m.id, reportsTo: P.mgr.m.id, confirm: "REMOVE" });
    expect(r).toMatchObject({ ok: true, movedClients: 2, movedReports: 1, clientsTo: "lmgr" });
    expect(await status(sumit)).toBe("REMOVED");
    expect(await prisma.appAccess.count({ where: { membershipId: sumit.m.id } })).toBe(0);
    expect((await prisma.client.findMany({ where: { id: { in: [c1.id, c2.id] } } })).map((c) => c.ownerId)).toEqual([P.mgr.m.id, P.mgr.m.id]);
    expect((await prisma.membership.findUnique({ where: { id: junior.m.id } })).reportsToId).toBe(P.mgr.m.id);
    expect((await audit(A, "team.removed"))[0].summary).toBe("ladmin removed r1 and moved 2 clients to lmgr; 1 person now reports to lmgr");
    expect((await prisma.emailLog.findFirst({ where: { to: mail("r1") } })).subject).toBe(`You were removed from ${A.name}`);
    expect(await loadValidUser({ userId: sumit.user.id })).toBeNull();
    // The team list no longer shows them, but the user and their name are still on record.
    expect((await getTeam(S.owner)).members.some((m) => m.id === sumit.m.id)).toBe(false);
    expect((await prisma.user.findUnique({ where: { id: sumit.user.id } })).name).toBe("r1");
  });

  it("is all or nothing: a failure part-way changes nothing", async () => {
    const p = await person("r2", "MEMBER", { apps: ["CRM"] });
    const c = await client("c3", p.m.id);
    // A new manager who is below the removed person would make a loop, so it is refused before anything moves.
    const below = await person("r2below", "MEMBER", { reportsToId: p.m.id });
    const r = await removeMember(S.admin, { membershipId: p.m.id, clientsTo: P.mgr.m.id, reportsTo: below.m.id, confirm: "REMOVE" });
    expect(r.ok).toBe(false);
    expect(await status(p)).toBe("ACTIVE");
    expect((await prisma.client.findUnique({ where: { id: c.id } })).ownerId).toBe(p.m.id);
    expect(await prisma.appAccess.count({ where: { membershipId: p.m.id } })).toBe(1);
  });

  it("a person with nothing to hand over is removed without choices", async () => {
    const p = await person("r3");
    expect(await removeMember(S.owner, { membershipId: p.m.id, confirm: "REMOVE" })).toMatchObject({ ok: true, movedClients: 0, movedReports: 0 });
    expect((await audit(A, "team.removed"))[0].summary).toBe("lowner removed r3");
  });

  it("never the owner or yourself; a manager cannot", async () => {
    expect((await removeMember(S.admin, { membershipId: P.owner.m.id, confirm: "REMOVE" })).error).toMatch(/owner can't be removed/);
    expect((await removeMember(S.admin, { membershipId: P.admin.m.id, confirm: "REMOVE" })).error).toMatch(/can't remove yourself/);
    await expect(removeMember(S.mgr, { membershipId: P.admin2.m.id, confirm: "REMOVE" })).rejects.toBeInstanceOf(AccessError);
  });

  it("a removed person can be invited again and keeps one membership", async () => {
    const p = await person("r4", "MEMBER", { apps: ["CRM"] });
    await removeMember(S.owner, { membershipId: p.m.id, confirm: "REMOVE" });
    const r = await createInvites(S.owner, { emails: [mail("r4")], role: "MEMBER", apps: ["SOP"] });
    expect(r.ok).toBe(true);
    const rows = await prisma.membership.findMany({ where: { userId: p.user.id, organizationId: A.id }, include: { appAccess: true } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: p.m.id, status: "INVITED", removedAt: null });
    expect(rows[0].appAccess.map((a) => a.app)).toEqual(["SOP"]);
  });

  it("another organization cannot deactivate or remove these people", async () => {
    const p = await person("r5");
    expect((await deactivateMember(S.bOwner, { membershipId: p.m.id })).ok).toBe(false);
    expect((await removeMember(S.bOwner, { membershipId: p.m.id, confirm: "REMOVE" })).ok).toBe(false);
    expect(await status(p)).toBe("ACTIVE");
  });
});

describe("transfer ownership", () => {
  it("needs the owner, an active Admin and the password; the old owner keeps every app as an Admin; both are emailed", async () => {
    await expect(transferOwnership(S.admin, { toMembershipId: P.admin2.m.id, password: PASS })).rejects.toBeInstanceOf(AccessError);
    expect((await transferOwnership(S.owner, { toMembershipId: P.mgr.m.id, password: PASS })).error).toMatch(/only go to an active Admin/);
    expect((await transferOwnership(S.owner, { toMembershipId: P.admin2.m.id, password: "wrong-password-1" }, `ip-${stamp}`)).error).toBe("That password isn't right.");
    expect(await status(P.admin2)).toBe("ACTIVE");
    expect((await prisma.membership.findUnique({ where: { id: P.admin2.m.id } })).role).toBe("ADMIN");

    expect(await transferOwnership(S.owner, { toMembershipId: P.admin2.m.id, password: PASS }, `ip-${stamp}`)).toMatchObject({ ok: true, newOwner: "ladmin2" });
    const [oldOwner, newOwner] = await Promise.all([
      prisma.membership.findUnique({ where: { id: P.owner.m.id }, include: { appAccess: true } }),
      prisma.membership.findUnique({ where: { id: P.admin2.m.id } }),
    ]);
    expect(newOwner).toMatchObject({ role: "OWNER", reportsToId: null });
    expect(oldOwner).toMatchObject({ role: "ADMIN", reportsToId: P.admin2.m.id });
    expect(oldOwner.appAccess).toHaveLength(7);
    expect((await audit(A, "team.ownership_transferred"))[0].summary).toBe("lowner transferred ownership to ladmin2");
    expect((await prisma.emailLog.findMany({ where: { to: { in: [mail("lowner"), mail("ladmin2")] }, template: "team-ownership" } })).length).toBe(2);
    // Only one owner exists afterwards.
    expect(await prisma.membership.count({ where: { organizationId: A.id, role: "OWNER", status: { not: "REMOVED" } } })).toBe(1);
  });

  it("locks after repeated wrong passwords", async () => {
    const o = await mk(B, "lbowner2", "OWNER", { password: PASS });
    const a = await mk(B, "lbadmin2", "ADMIN");
    const s = sess(B, o, "OWNER");
    for (let i = 0; i < 5; i++) await transferOwnership(s, { toMembershipId: a.m.id, password: "nope-nope-nope" }, `lock-${stamp}`);
    expect((await transferOwnership(s, { toMembershipId: a.m.id, password: PASS }, `lock-${stamp}`)).error).toMatch(/Too many attempts/);
  });
});
