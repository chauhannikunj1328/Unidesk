import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/prisma";
import { getTeam } from "@/features/team/queries";
import { AccessError } from "@/server/access";

/** What each role may learn about other people on the Team page (Hub flow 04 and 06). Builds its own organization. */
const stamp = Date.now();
let org, p = {};

async function person(key, role, reportsToId = null) {
  const user = await prisma.user.create({ data: { email: `${key}-${stamp}@expo.test`, name: key } });
  const m = await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role, status: "ACTIVE", reportsToId } });
  await prisma.auditEvent.create({ data: { organizationId: org.id, actorId: user.id, action: "x.y", summary: `${key} did something private` } });
  return { user, m, session: { userId: user.id, name: key, orgId: org.id, role, membershipId: m.id, apps: [] } };
}

beforeAll(async () => {
  org = await prisma.organization.create({ data: { name: `Expo Org ${stamp}` } });
  p.owner = await person("owner", "OWNER");
  p.admin = await person("admin", "ADMIN", p.owner.m.id);
  p.mgr = await person("mgr", "MANAGER", p.admin.m.id);
  p.report = await person("report", "MEMBER", p.mgr.m.id);
  p.other = await person("other", "MEMBER", p.admin.m.id);
  p.acct = await person("acct", "ACCOUNTANT", p.owner.m.id);
  p.client = await person("client", "CLIENT", p.owner.m.id);
});
afterAll(async () => {
  await prisma.auditEvent.deleteMany({ where: { organizationId: org.id } });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${stamp}@expo.test` } } });
  await prisma.$disconnect();
});

const activityOf = (data, name) => data.members.find((m) => m.name === name).activity.map((a) => a.summary);

describe("recent activity on the Team page", () => {
  it("owners and admins see everyone's", async () => {
    for (const who of [p.owner, p.admin]) {
      const data = await getTeam(who.session);
      for (const n of ["owner", "admin", "mgr", "report", "other", "acct"]) expect(activityOf(data, n)).toEqual([`${n} did something private`]);
    }
  });
  it("a member sees only their own", async () => {
    const data = await getTeam(p.report.session);
    expect(activityOf(data, "report")).toEqual(["report did something private"]);
    for (const n of ["owner", "admin", "mgr", "other", "acct"]) expect(activityOf(data, n), n).toEqual([]);
  });
  it("an accountant sees only their own", async () => {
    const data = await getTeam(p.acct.session);
    expect(activityOf(data, "acct")).toHaveLength(1);
    for (const n of ["owner", "admin", "mgr", "report", "other"]) expect(activityOf(data, n), n).toEqual([]);
  });
  it("a manager sees their reports' and their own, not other teams'", async () => {
    const data = await getTeam(p.mgr.session);
    expect(activityOf(data, "report")).toHaveLength(1);
    expect(activityOf(data, "mgr")).toHaveLength(1);
    expect(activityOf(data, "other")).toEqual([]);
    expect(activityOf(data, "owner")).toEqual([]);
  });
  it("the activity never appears anywhere in the data a member receives", async () => {
    const json = JSON.stringify(await getTeam(p.report.session));
    expect(json).not.toContain("owner did something private");
    expect(json).not.toContain("admin did something private");
  });
  it("clients cannot read the team at all", async () => {
    await expect(getTeam(p.client.session)).rejects.toBeInstanceOf(AccessError);
  });
});
