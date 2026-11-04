import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/prisma";
import { AccessError } from "@/server/access";
import { bulkChange, changeAppAccess, changeManager, changeRole } from "@/features/team/core";

/** These tests build their own two organizations and remove them afterwards. They never touch the demo data. */
let A, B, ids = {}, sess = {};
const stamp = Date.now();

async function person(org, key, role, apps = [], reportsToId = null) {
  const user = await prisma.user.create({ data: { email: `${key}-${stamp}@test.example`, name: key } });
  const m = await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role, status: "ACTIVE", reportsToId } });
  for (const app of apps) await prisma.appAccess.create({ data: { membershipId: m.id, organizationId: org.id, app } });
  return { user, m };
}
const session = (org, p, role, apps = []) => ({ userId: p.user.id, name: p.user.name, orgId: org.id, role, membershipId: p.m.id, apps });

beforeAll(async () => {
  A = await prisma.organization.create({ data: { name: `Test A ${stamp}`, seatLimit: 4 } });
  B = await prisma.organization.create({ data: { name: `Test B ${stamp}` } });
  const owner = await person(A, "owner", "OWNER");
  const admin = await person(A, "admin", "ADMIN", ["CRM"], owner.m.id);
  const mgr = await person(A, "mgr", "MANAGER", ["CRM"], admin.m.id);
  const mine = await person(A, "mine", "MEMBER", [], mgr.m.id);
  const other = await person(A, "other", "MEMBER", [], admin.m.id);
  const client = await person(A, "client", "CLIENT", [], owner.m.id);
  const bOwner = await person(B, "bowner", "OWNER");
  ids = { owner, admin, mgr, mine, other, client, bOwner };
  sess = { owner: session(A, owner, "OWNER"), admin: session(A, admin, "ADMIN"), mgr: session(A, mgr, "MANAGER"), mine: session(A, mine, "MEMBER"), bOwner: session(B, bOwner, "OWNER") };
});

afterAll(async () => {
  await prisma.auditEvent.deleteMany({ where: { organizationId: { in: [A.id, B.id] } } });
  await prisma.organization.deleteMany({ where: { id: { in: [A.id, B.id] } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${stamp}@test.example` } } });
  await prisma.$disconnect();
});

const audit = (orgId, action) => prisma.auditEvent.findMany({ where: { organizationId: orgId, action } });

describe("app access", () => {
  it("gives and removes access, writing one plain-language audit event each time", async () => {
    const r = await changeAppAccess(sess.owner, { membershipId: ids.other.m.id, app: "WORKDRIVE", enabled: true });
    expect(r).toMatchObject({ ok: true, changed: true });
    expect(await prisma.appAccess.count({ where: { membershipId: ids.other.m.id, app: "WORKDRIVE" } })).toBe(1);
    const events = await audit(A.id, "team.access_given");
    expect(events.at(-1).summary).toBe("owner gave other access to Workdrive");

    await changeAppAccess(sess.owner, { membershipId: ids.other.m.id, app: "WORKDRIVE", enabled: false });
    expect(await prisma.appAccess.count({ where: { membershipId: ids.other.m.id, app: "WORKDRIVE" } })).toBe(0);
    expect((await audit(A.id, "team.access_removed")).at(-1).summary).toBe("owner removed other's access to Workdrive");
  });

  it("is a no-op, with no audit event, when nothing changes", async () => {
    const before = await prisma.auditEvent.count({ where: { organizationId: A.id } });
    const r = await changeAppAccess(sess.owner, { membershipId: ids.other.m.id, app: "SOP", enabled: false });
    expect(r).toEqual({ ok: true, changed: false });
    expect(await prisma.auditEvent.count({ where: { organizationId: A.id } })).toBe(before);
  });

  it("never changes the owner's apps", async () => {
    const r = await changeAppAccess(sess.admin, { membershipId: ids.owner.m.id, app: "CRM", enabled: false });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/owner always has every app/i);
  });

  it("clients can only be given portal apps", async () => {
    expect((await changeAppAccess(sess.owner, { membershipId: ids.client.m.id, app: "CRM", enabled: true })).error).toMatch(/not available to clients/i);
    expect((await changeAppAccess(sess.owner, { membershipId: ids.client.m.id, app: "WORKDRIVE", enabled: true })).ok).toBe(true);
  });

  it("blocks a change that needs a seat that is not free", async () => {
    // seatLimit is 4. The owner counts for every app even without rows, so CRM already holds owner + admin + mgr; one more fits, the next does not.
    expect((await changeAppAccess(sess.owner, { membershipId: ids.mine.m.id, app: "CRM", enabled: true })).ok).toBe(true);
    const r = await changeAppAccess(sess.owner, { membershipId: ids.other.m.id, app: "CRM", enabled: true });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no free seat on crm/i);
    expect(await prisma.appAccess.count({ where: { membershipId: ids.other.m.id, app: "CRM" } })).toBe(0);
  });

  it("client logins do not use seats", async () => {
    const before = await prisma.appAccess.count({ where: { organizationId: A.id, app: "CRM" } });
    expect(before).toBe(3);
    expect((await changeAppAccess(sess.owner, { membershipId: ids.client.m.id, app: "INVOICING", enabled: true })).ok).toBe(true);
  });

  it("managers change only people who report to them", async () => {
    expect((await changeAppAccess(sess.mgr, { membershipId: ids.mine.m.id, app: "SOP", enabled: true })).ok).toBe(true);
    await expect(changeAppAccess(sess.mgr, { membershipId: ids.other.m.id, app: "SOP", enabled: true })).rejects.toBeInstanceOf(AccessError);
  });

  it("members cannot change access at all", async () => {
    await expect(changeAppAccess(sess.mine, { membershipId: ids.other.m.id, app: "SOP", enabled: true })).rejects.toBeInstanceOf(AccessError);
  });

  it("another organization cannot see or change this person", async () => {
    const r = await changeAppAccess(sess.bOwner, { membershipId: ids.other.m.id, app: "SOP", enabled: true });
    expect(r).toEqual({ ok: false, error: "This person is no longer in your workspace." });
    expect(await prisma.appAccess.count({ where: { membershipId: ids.other.m.id, app: "SOP" } })).toBe(0);
    expect(await prisma.auditEvent.count({ where: { organizationId: B.id } })).toBe(0);
  });
});

describe("roles and managers", () => {
  it("changes a role and records it", async () => {
    const r = await changeRole(sess.owner, { membershipId: ids.other.m.id, role: "ACCOUNTANT" });
    expect(r).toMatchObject({ ok: true, changed: true, reducesPowers: false });
    expect((await audit(A.id, "team.role_changed")).at(-1).summary).toBe("owner changed other's role from Member to Accountant");
    expect((await changeRole(sess.owner, { membershipId: ids.other.m.id, role: "MEMBER" })).reducesPowers).toBe(true);
  });
  it("keeps exactly one owner", async () => {
    expect((await changeRole(sess.admin, { membershipId: ids.other.m.id, role: "OWNER" })).error).toMatch(/only one owner/i);
    expect((await changeRole(sess.admin, { membershipId: ids.owner.m.id, role: "ADMIN" })).error).toMatch(/only one owner/i);
  });
  it("managers and members cannot change roles", async () => {
    await expect(changeRole(sess.mgr, { membershipId: ids.mine.m.id, role: "ADMIN" })).rejects.toBeInstanceOf(AccessError);
  });
  it("blocks reporting loops and self-reporting", async () => {
    // admin -> mgr -> mine. Making admin report to mine would loop.
    const loop = await changeManager(sess.owner, { membershipId: ids.admin.m.id, reportsToId: ids.mine.m.id });
    expect(loop.ok).toBe(false);
    expect(loop.error).toMatch(/loop/i);
    expect((await changeManager(sess.owner, { membershipId: ids.admin.m.id, reportsToId: ids.admin.m.id })).error).toMatch(/themselves/i);
  });
  it("sets a manager and records it", async () => {
    const r = await changeManager(sess.owner, { membershipId: ids.other.m.id, reportsToId: ids.mgr.m.id });
    expect(r.ok).toBe(true);
    expect((await audit(A.id, "team.manager_changed")).at(-1).summary).toBe("owner set other to report to mgr");
  });
});

describe("bulk changes", () => {
  it("applies the single-person logic to each person and reports failures", async () => {
    const r = await bulkChange(sess.owner, { membershipIds: [ids.other.m.id, ids.owner.m.id], change: { type: "access", app: "ACCOUNTING", enabled: true } });
    expect(r.failed).toBe(1);
    expect(r.results.find((x) => x.membershipId === ids.owner.m.id).error).toMatch(/owner always/i);
    expect(r.results.find((x) => x.membershipId === ids.other.m.id).ok).toBe(true);
  });
});
