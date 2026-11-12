import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/prisma";
import { AccessError } from "@/server/access";
import { changeSharedData, getSharedData, restoreSharedData } from "@/features/team/shared-data";
import { DEFAULTS, applyChange, confirmationFor, countOn, rowWarning, toastText } from "@/features/team/shared-data-rules";

describe("rules", () => {
  it("defaults match the spec table", () => {
    expect(DEFAULTS.PROPOSALS).toEqual({ contacts: true, clients: true, projects: false });
    expect(DEFAULTS.WORKDRIVE).toEqual({ contacts: false, clients: true, projects: true });
    expect(DEFAULTS.SOP).toEqual({ contacts: false, clients: true, projects: false });
    expect(Object.keys(DEFAULTS)).toHaveLength(7);
  });
  it("the meter counts the switches that are on", () => {
    expect(countOn({ contacts: true, clients: true, projects: false })).toBe(2);
    expect(countOn({ contacts: false, clients: false, projects: false })).toBe(0);
  });
  it("Clients off turns Projects off, and Projects on turns Clients on, each with a note", () => {
    expect(applyChange({ contacts: true, clients: true, projects: true }, "clients", false)).toEqual({ next: { contacts: true, clients: false, projects: false }, note: "Projects need Clients, so Projects were turned off too." });
    expect(applyChange({ contacts: true, clients: false, projects: false }, "projects", true)).toEqual({ next: { contacts: true, clients: true, projects: true }, note: "Projects need Clients, so Clients were turned on too." });
    expect(applyChange({ contacts: true, clients: true, projects: false }, "contacts", false).note).toBeNull();
  });
  it("turning something off asks with the consequence; turning on asks nothing", () => {
    expect(confirmationFor("SOP", "clients", DEFAULTS.SOP)).toEqual({ title: "Stop SOP reading clients?", consequence: "SOP will no longer show client folders. Existing SOPs keep their client label." });
    expect(confirmationFor("INVOICING", "clients", DEFAULTS.INVOICING).consequence).toBe("Invoicing can't send invoices without clients. Projects will be turned off too.");
    expect(confirmationFor("PROPOSALS", "contacts", { contacts: false, clients: true, projects: false })).toBeNull();
  });
  it("words never mention CRM areas, SSO or module sessions", () => {
    const all = JSON.stringify([toastText("CRM", "clients", false), rowWarning("INVOICING", { clients: false })]);
    expect(all).not.toMatch(/CRM areas|SSO|module session/i);
    expect(toastText("Proposals", "contacts", true)).toBe("Proposals can now read contacts.");
  });
  it("only apps that need clients keep a warning while Clients is off", () => {
    expect(rowWarning("INVOICING", { contacts: true, clients: false, projects: false })).toBe("Invoicing can't send invoices without clients.");
    expect(rowWarning("SOP", { contacts: true, clients: false, projects: false })).toBeNull();
    expect(rowWarning("INVOICING", DEFAULTS.INVOICING)).toBeNull();
  });
});

let A, B, sess = {};
const stamp = Date.now();
const mk = async (org, key, role) => {
  const user = await prisma.user.create({ data: { email: `${key}-${stamp}@test.example`, name: key } });
  const m = await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role, status: "ACTIVE" } });
  return { userId: user.id, name: key, orgId: org.id, role, membershipId: m.id, apps: [] };
};

beforeAll(async () => {
  A = await prisma.organization.create({ data: { name: `Shared A ${stamp}` } });
  B = await prisma.organization.create({ data: { name: `Shared B ${stamp}` } });
  sess = { owner: await mk(A, "sowner", "OWNER"), admin: await mk(A, "sadmin", "ADMIN"), mgr: await mk(A, "smgr", "MANAGER"), bOwner: await mk(B, "sbowner", "OWNER") };
});
afterAll(async () => {
  await prisma.auditEvent.deleteMany({ where: { organizationId: { in: [A.id, B.id] } } });
  await prisma.organization.deleteMany({ where: { id: { in: [A.id, B.id] } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${stamp}@test.example` } } });
  await prisma.$disconnect();
});

const audit = (org) => prisma.auditEvent.findMany({ where: { organizationId: org.id, action: { startsWith: "team.shared_data" } }, orderBy: { createdAt: "asc" } });

describe("saving", () => {
  it("lists all seven apps from the defaults when nothing was saved", async () => {
    const d = await getSharedData(sess.owner);
    expect(d.apps).toHaveLength(7);
    expect(d.apps.find((a) => a.code === "SOP")).toMatchObject({ settings: DEFAULTS.SOP, count: 1, description: "Process guides and training" });
    expect(d.columns).toEqual({ contacts: 4, clients: 7, projects: 4 });
  });

  it("saves a switch, writes a plain audit event, and the list reflects it", async () => {
    const r = await changeSharedData(sess.admin, { app: "PROPOSALS", type: "projects", enabled: true });
    expect(r).toMatchObject({ ok: true, changed: true, label: "Proposals", settings: { projects: true } });
    expect((await audit(A)).at(-1).summary).toBe("sadmin let Proposals read projects");
    expect((await getSharedData(sess.owner)).apps.find((a) => a.code === "PROPOSALS").count).toBe(3);
  });

  it("does nothing, and writes no event, when nothing changes", async () => {
    const before = (await audit(A)).length;
    expect(await changeSharedData(sess.owner, { app: "PROPOSALS", type: "projects", enabled: true })).toMatchObject({ ok: true, changed: false });
    expect((await audit(A)).length).toBe(before);
  });

  it("Clients off also turns Projects off, with one event for each", async () => {
    const r = await changeSharedData(sess.owner, { app: "PROPOSALS", type: "clients", enabled: false });
    expect(r.settings).toEqual({ contacts: true, clients: false, projects: false });
    expect(r.note).toBe("Projects need Clients, so Projects were turned off too.");
    const events = (await audit(A)).slice(-2).map((e) => e.summary);
    expect(events.sort()).toEqual(["sowner stopped Proposals from reading clients", "sowner stopped Proposals from reading projects"]);
  });

  it("Undo puts all three switches back, and Projects never end up on without Clients", async () => {
    const r = await restoreSharedData(sess.owner, { app: "PROPOSALS", values: { contacts: true, clients: true, projects: true } });
    expect(r.settings).toEqual({ contacts: true, clients: true, projects: true });
    expect((await restoreSharedData(sess.owner, { app: "PROPOSALS", values: { contacts: true, clients: false, projects: true } })).settings.clients).toBe(true);
    await restoreSharedData(sess.owner, { app: "PROPOSALS", values: DEFAULTS.PROPOSALS });
    expect((await getSharedData(sess.owner)).apps.find((a) => a.code === "PROPOSALS").settings).toEqual(DEFAULTS.PROPOSALS);
  });

  it("rejects unknown apps and settings", async () => {
    expect((await changeSharedData(sess.owner, { app: "NOPE", type: "clients", enabled: true })).ok).toBe(false);
    expect((await changeSharedData(sess.owner, { app: "CRM", type: "nope", enabled: true })).ok).toBe(false);
  });
});

describe("who may see and change it", () => {
  it("only owners and admins", async () => {
    await expect(getSharedData(sess.mgr)).rejects.toBeInstanceOf(AccessError);
    await expect(changeSharedData(sess.mgr, { app: "CRM", type: "contacts", enabled: false })).rejects.toBeInstanceOf(AccessError);
    await expect(restoreSharedData(sess.mgr, { app: "CRM", values: DEFAULTS.CRM })).rejects.toBeInstanceOf(AccessError);
  });
  it("one organization never changes or reads another's settings", async () => {
    await changeSharedData(sess.owner, { app: "SOP", type: "clients", enabled: false });
    expect((await getSharedData(sess.bOwner)).apps.find((a) => a.code === "SOP").settings).toEqual(DEFAULTS.SOP);
    expect(await prisma.sharedDataSetting.count({ where: { organizationId: B.id } })).toBe(0);
    await changeSharedData(sess.bOwner, { app: "CRM", type: "contacts", enabled: false });
    expect((await getSharedData(sess.owner)).apps.find((a) => a.code === "CRM").settings).toEqual(DEFAULTS.CRM);
    expect((await audit(B)).map((e) => e.summary)).toEqual(["sbowner stopped CRM from reading contacts"]);
  });
});
