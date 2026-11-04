import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/prisma";
import { seatUsage } from "@/features/team/seats";
import { changeAppAccess } from "@/features/team/core";
import { getTeam } from "@/features/team/queries";

describe("seatUsage (pure)", () => {
  const people = [
    { role: "OWNER", status: "ACTIVE", apps: [] }, // no rows, still holds every app
    { role: "ADMIN", status: "active", apps: ["CRM"] },
    { role: "MEMBER", status: "INVITED", apps: ["CRM", "SOP"] },
    { role: "CLIENT", status: "ACTIVE", apps: ["WORKDRIVE", "CRM"] }, // clients are free
    { role: "MEMBER", status: "INACTIVE", apps: ["CRM"] }, // removed people are free
  ];
  it("counts the owner in every app, clients and removed people in none", () => {
    const u = seatUsage(people);
    expect(u.people).toBe(3);
    expect(u.perApp.CRM).toBe(3);
    expect(u.perApp.SOP).toBe(2);
    expect(u.perApp.WORKDRIVE).toBe(1);
    expect(u.perApp.ACCOUNTING).toBe(1);
  });
  it("accepts status in either case", () => {
    expect(seatUsage([{ role: "MEMBER", status: "Inactive", apps: ["CRM"] }]).perApp.CRM).toBe(0);
  });
});

/** The screen and the server must agree, including for an owner who has no AppAccess rows. */
describe("the numbers shown and the limit enforced agree", () => {
  const stamp = Date.now();
  let org, owner, admin, other;
  const sess = (p, role) => ({ userId: p.user.id, name: p.user.name, orgId: org.id, role, membershipId: p.m.id, apps: [] });
  async function person(key, role, apps = []) {
    const user = await prisma.user.create({ data: { email: `${key}-${stamp}@seat.test`, name: key } });
    const m = await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role, status: "ACTIVE" } });
    for (const app of apps) await prisma.appAccess.create({ data: { membershipId: m.id, organizationId: org.id, app } });
    return { user, m };
  }
  beforeAll(async () => {
    org = await prisma.organization.create({ data: { name: `Seat Org ${stamp}`, seatLimit: 2 } });
    owner = await person("owner", "OWNER"); // no rows
    admin = await person("admin", "ADMIN", ["CRM"]);
    other = await person("other", "MEMBER");
  });
  afterAll(async () => {
    await prisma.organization.delete({ where: { id: org.id } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${stamp}@seat.test` } } });
    await prisma.$disconnect();
  });

  it("shows CRM as full and refuses another grant", async () => {
    const data = await getTeam(sess(owner, "OWNER"));
    expect(data.appUsage.CRM).toBe(2); // owner + admin
    expect(data.seats.limit).toBe(2);
    const r = await changeAppAccess(sess(owner, "OWNER"), { membershipId: other.m.id, app: "CRM", enabled: true });
    expect(r).toEqual({ ok: false, error: "No free seat on CRM." });
  });
  it("allows a grant in an app that still has room", async () => {
    const data = await getTeam(sess(owner, "OWNER"));
    expect(data.appUsage.SOP).toBe(1); // owner only
    expect((await changeAppAccess(sess(owner, "OWNER"), { membershipId: other.m.id, app: "SOP", enabled: true })).ok).toBe(true);
    expect((await getTeam(sess(owner, "OWNER"))).appUsage.SOP).toBe(2);
  });
});

describe("manager links survive a removed person", () => {
  it("clears reportsToId and invitedById instead of leaving dangling ids", async () => {
    const stamp = Date.now();
    const org = await prisma.organization.create({ data: { name: `FK Org ${stamp}` } });
    const mk = async (k, extra = {}) => {
      const u = await prisma.user.create({ data: { email: `${k}-${stamp}@fk.test`, name: k } });
      return prisma.membership.create({ data: { userId: u.id, organizationId: org.id, role: "MEMBER", status: "ACTIVE", ...extra } });
    };
    const boss = await mk("boss");
    const report = await mk("report", { reportsToId: boss.id, invitedById: boss.id });
    await prisma.membership.delete({ where: { id: boss.id } });
    const after = await prisma.membership.findUnique({ where: { id: report.id } });
    expect(after.reportsToId).toBeNull();
    expect(after.invitedById).toBeNull();
    await prisma.organization.delete({ where: { id: org.id } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${stamp}@fk.test` } } });
    await prisma.$disconnect();
  });
  it("refuses a manager id that does not exist", async () => {
    const stamp = Date.now();
    const org = await prisma.organization.create({ data: { name: `FK2 Org ${stamp}` } });
    const u = await prisma.user.create({ data: { email: `x-${stamp}@fk.test`, name: "x" } });
    await expect(prisma.membership.create({ data: { userId: u.id, organizationId: org.id, role: "MEMBER", reportsToId: "does-not-exist" } })).rejects.toThrow();
    await prisma.organization.delete({ where: { id: org.id } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${stamp}@fk.test` } } });
  });
});
