import { describe, expect, it, vi } from "vitest";
import { withOrg, SCOPED_MODELS, APPEND_ONLY_MODELS } from "@/server/db";

// A fake Prisma client that records every call so we can check organizationId is always applied.
function fakeClient() {
  const calls = [];
  const delegate = (model) =>
    new Proxy({}, { get: (_t, method) => (args) => { calls.push({ model, method, args }); return Promise.resolve(null); } });
  const client = {};
  for (const m of [...SCOPED_MODELS, ...APPEND_ONLY_MODELS]) client[m] = delegate(m);
  return { client, calls };
}

const session = { userId: "u1", orgId: "org-A", role: "OWNER", apps: [] };

describe("withOrg", () => {
  it("requires a session with an organization", () => {
    expect(() => withOrg(null)).toThrow();
    expect(() => withOrg({ userId: "u1" })).toThrow();
  });

  it("adds organizationId to every read, update and delete on every scoped model", async () => {
    const { client, calls } = fakeClient();
    const db = withOrg(session, client);
    for (const model of SCOPED_MODELS) {
      await db[model].findMany({ where: { organizationId: "org-B" } }); // a caller cannot override the scope
      await db[model].findFirst({});
      await db[model].count();
      await db[model].updateMany({ where: { id: "x" }, data: {} });
      await db[model].deleteMany({ where: { id: "x" } });
    }
    expect(calls.length).toBe(SCOPED_MODELS.length * 5);
    for (const c of calls) expect(c.args.where.organizationId, `${c.model}.${c.method}`).toBe("org-A");
  });

  it("stamps organizationId on every create, even if the caller passes another", async () => {
    const { client, calls } = fakeClient();
    const db = withOrg(session, client);
    for (const model of [...SCOPED_MODELS, ...APPEND_ONLY_MODELS]) await db[model].create({ data: { organizationId: "org-B" } });
    for (const c of calls) expect(c.args.data.organizationId, c.model).toBe("org-A");
  });

  it("audit events are append-only: no update or delete exists", () => {
    const db = withOrg(session, fakeClient().client);
    for (const model of APPEND_ONLY_MODELS) {
      expect(Object.keys(db[model]).sort()).toEqual(["count", "create", "findMany"]);
    }
  });

  it("every Prisma model with organizationId is listed as scoped or append-only", async () => {
    const { Prisma } = await import("@prisma/client");
    const withOrgId = Prisma.dmmf.datamodel.models
      .filter((m) => m.fields.some((f) => f.name === "organizationId"))
      .map((m) => m.name.charAt(0).toLowerCase() + m.name.slice(1));
    for (const m of withOrgId) expect([...SCOPED_MODELS, ...APPEND_ONLY_MODELS], `${m} is missing from withOrg`).toContain(m);
  });
});

describe("isolation against the real database", () => {
  it("organization A cannot read, change or delete organization B's clients", async () => {
    const { prisma } = await import("@/server/prisma");
    const orgs = await prisma.organization.findMany({ where: { name: { in: ["Unidesk Demo", "Harbor Advisory"] } } });
    const a = orgs.find((o) => o.name === "Unidesk Demo");
    const b = orgs.find((o) => o.name === "Harbor Advisory");
    expect(a && b, "run `npm run db:seed` first").toBeTruthy();

    const dbA = withOrg({ userId: "x", orgId: a.id, role: "OWNER", apps: [] });
    const dbB = withOrg({ userId: "y", orgId: b.id, role: "OWNER", apps: [] });

    const listA = await dbA.client.findMany();
    const listB = await dbB.client.findMany();
    expect(listA.length).toBeGreaterThan(0);
    expect(listB.length).toBeGreaterThan(0);
    expect(listA.every((c) => c.organizationId === a.id)).toBe(true);
    expect(listB.every((c) => c.organizationId === b.id)).toBe(true);

    const target = listB[0];
    expect(await dbA.client.findFirst({ where: { id: target.id } })).toBeNull();
    expect((await dbA.client.updateMany({ where: { id: target.id }, data: { name: "HACKED" } })).count).toBe(0);
    expect((await dbA.client.deleteMany({ where: { id: target.id } })).count).toBe(0);
    expect((await dbB.client.findFirst({ where: { id: target.id } })).name).toBe(target.name);
  });
});
