import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/prisma";
import { AccessError } from "@/server/access";
import { createInvites, deliverInvites, flushDueInvites, resendInvite, undoInvites } from "@/features/team/invites";
import { acceptSignedIn, acceptWithNewAccount, getInviteInfo } from "@/features/team/accept";

/** Builds its own two organizations and removes them afterwards. Never touches the demo data. */
let A, B, ids = {}, sess = {};
const stamp = Date.now();
const mail = (k) => `${k}-${stamp}@test.example`;

async function person(org, key, role, apps = [], reportsToId = null) {
  const user = await prisma.user.create({ data: { email: mail(key), name: key } });
  const m = await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role, status: "ACTIVE", reportsToId } });
  for (const app of apps) await prisma.appAccess.create({ data: { membershipId: m.id, organizationId: org.id, app } });
  return { user, m };
}
const session = (org, p, role) => ({ userId: p.user.id, name: p.user.name, orgId: org.id, role, membershipId: p.m.id, apps: [] });
const send = (s, extra = {}) => createInvites(s, { emails: [mail("anna")], role: "MEMBER", apps: ["CRM"], ...extra });
const sentTo = (email) => prisma.emailLog.findMany({ where: { to: email } });
const pastUndo = () => prisma.invite.updateMany({ where: { organizationId: { in: [A.id, B.id] }, deliveredAt: null }, data: { deliverAfter: new Date(Date.now() - 1000) } });

beforeAll(async () => {
  A = await prisma.organization.create({ data: { name: `Invite A ${stamp}`, seatLimit: 30 } });
  B = await prisma.organization.create({ data: { name: `Invite B ${stamp}`, seatLimit: 4 } });
  const owner = await person(A, "owner", "OWNER");
  const admin = await person(A, "admin", "ADMIN", ["CRM"], owner.m.id);
  const mgr = await person(A, "mgr", "MANAGER", ["CRM"], admin.m.id);
  const member = await person(A, "member", "MEMBER", [], mgr.m.id);
  const bOwner = await person(B, "bowner", "OWNER");
  ids = { owner, admin, mgr, member, bOwner };
  sess = { owner: session(A, owner, "OWNER"), admin: session(A, admin, "ADMIN"), mgr: session(A, mgr, "MANAGER"), member: session(A, member, "MEMBER"), bOwner: session(B, bOwner, "OWNER") };
});

afterAll(async () => {
  await prisma.auditEvent.deleteMany({ where: { organizationId: { in: [A.id, B.id] } } });
  await prisma.organization.deleteMany({ where: { id: { in: [A.id, B.id] } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${stamp}@test.example` } } });
  await prisma.emailLog.deleteMany({ where: { to: { endsWith: `-${stamp}@test.example` } } });
  await prisma.$disconnect();
});

describe("sending invites", () => {
  it("saves the person as Invited with their role, apps and manager, and writes a plain audit event", async () => {
    const r = await send(sess.owner, { emails: [mail("anna"), mail("tom")], apps: ["CRM", "APPOINTMENT"], reportsToId: ids.mgr.m.id });
    expect(r).toMatchObject({ ok: true, undoSeconds: 8 });
    expect(r.invited).toHaveLength(2);
    const m = await prisma.membership.findFirst({ where: { organizationId: A.id, user: { email: mail("anna") } }, include: { appAccess: true } });
    expect(m).toMatchObject({ status: "INVITED", role: "MEMBER", reportsToId: ids.mgr.m.id, invitedById: ids.owner.m.id });
    expect(m.appAccess.map((a) => a.app).sort()).toEqual(["APPOINTMENT", "CRM"]);
    const ev = await prisma.auditEvent.findFirst({ where: { organizationId: A.id, action: "team.invited", entityId: m.id } });
    expect(ev.summary).toBe(`owner invited ${mail("anna")} as Member (Appointment, CRM)`);
    await undoInvites(sess.owner, { batchId: r.batchId });
  });

  it("sends no email until the Undo time has passed, and not at all after Undo", async () => {
    const r = await send(sess.owner, { emails: [mail("undo")] });
    expect(r.ok).toBe(true);
    expect((await deliverInvites(sess.owner, { batchId: r.batchId })).sent).toBe(0); // too early
    expect(await sentTo(mail("undo"))).toHaveLength(0);
    const u = await undoInvites(sess.owner, { batchId: r.batchId });
    expect(u).toMatchObject({ ok: true, undone: 1 });
    await pastUndo();
    expect((await deliverInvites(sess.owner, { batchId: r.batchId })).sent).toBe(0);
    expect(await sentTo(mail("undo"))).toHaveLength(0);
    expect(await prisma.user.count({ where: { email: mail("undo") } })).toBe(0); // the empty account is gone too
    expect(await prisma.membership.count({ where: { organizationId: A.id, user: { email: mail("undo") } } })).toBe(0);
  });

  it("emails after the Undo time, once, with a working link", async () => {
    const r = await send(sess.owner, { emails: [mail("late")], note: "Welcome aboard" });
    await pastUndo();
    expect((await deliverInvites(sess.owner, { batchId: r.batchId })).sent).toBe(1);
    expect((await deliverInvites(sess.owner, { batchId: r.batchId })).sent).toBe(0); // safe to call twice
    const mails = await sentTo(mail("late"));
    expect(mails).toHaveLength(1);
    expect(mails[0].body).toContain("Welcome aboard");
    expect(mails[0].subject).toBe(`owner invited you to ${A.name}`);
    expect((await getInviteInfo(mails[0].link.split("/invite/")[1])).status).toBe("ok");
    // The page-load safety net sends anything left over and never throws.
    await flushDueInvites(sess.owner);
  });

  it("leaves out people already on the team and reports why", async () => {
    const r = await send(sess.owner, { emails: [mail("member"), mail("fresh")] });
    expect(r.invited.map((i) => i.email)).toEqual([mail("fresh")]);
    expect(r.skipped).toEqual([{ email: mail("member"), reason: "Already in your team" }]);
    await undoInvites(sess.owner, { batchId: r.batchId });
    expect((await send(sess.owner, { emails: [mail("member")] })).error).toBe("There is nobody new to invite.");
  });

  it("refuses when seats run out and creates nobody", async () => {
    // Leave exactly one free CRM seat: everyone already in the organization (invited people count) fills the rest.
    const used = await prisma.membership.count({ where: { organizationId: A.id, role: { not: "CLIENT" }, status: { not: "INACTIVE" }, OR: [{ role: "OWNER" }, { appAccess: { some: { app: "CRM" } } }] } });
    await prisma.organization.update({ where: { id: A.id }, data: { seatLimit: used + 1 } });
    const before = await prisma.membership.count({ where: { organizationId: A.id } });
    const r = await send(sess.owner, { emails: [mail("s1"), mail("s2")] });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("You need 1 more CRM seat. CRM costs $5.99 per person per month.");
    expect(await prisma.membership.count({ where: { organizationId: A.id } })).toBe(before);
    await prisma.organization.update({ where: { id: A.id }, data: { seatLimit: 30 } });
  });

  it("clients use no seats", async () => {
    const r = await send(sess.owner, { emails: [mail("c1"), mail("c2"), mail("c3")], role: "CLIENT", apps: ["WORKDRIVE"] });
    expect(r.ok).toBe(true);
    await undoInvites(sess.owner, { batchId: r.batchId });
  });

  it("a manager can only invite members, and they report to that manager", async () => {
    expect((await send(sess.mgr, { role: "ACCOUNTANT", apps: ["INVOICING"] })).error).toBe("Managers can invite Members only.");
    const r = await send(sess.mgr, { reportsToId: ids.owner.m.id });
    expect(r.ok).toBe(true);
    const m = await prisma.membership.findFirst({ where: { id: r.invited[0].membershipId } });
    expect(m.reportsToId).toBe(ids.mgr.m.id);
    await undoInvites(sess.mgr, { batchId: r.batchId });
  });

  it("members cannot invite and the owner role is never allowed", async () => {
    await expect(send(sess.member)).rejects.toBeInstanceOf(AccessError);
    await expect(send(sess.owner, { role: "OWNER" })).rejects.toBeInstanceOf(AccessError);
  });

  it("needs at least one app unless the person is an admin or client", async () => {
    expect((await send(sess.owner, { apps: [] })).error).toBe("Choose at least one app.");
    const r = await send(sess.owner, { emails: [mail("adm")], role: "ADMIN", apps: [] });
    // an admin gets every app, which needs seats in all seven: only CRM is tight here, so this passes
    expect(r.ok).toBe(true);
    await undoInvites(sess.owner, { batchId: r.batchId });
  });
});

describe("resend", () => {
  it("makes a new link and the old link stops working", async () => {
    const r = await send(sess.owner, { emails: [mail("again")] });
    await pastUndo();
    await deliverInvites(sess.owner, { batchId: r.batchId });
    const oldLink = (await sentTo(mail("again")))[0].link.split("/invite/")[1];
    expect((await resendInvite(sess.owner, { membershipId: r.invited[0].membershipId })).error).toMatch(/give it a minute/i);
    await prisma.invite.updateMany({ where: { membershipId: r.invited[0].membershipId }, data: { deliveredAt: new Date(Date.now() - 120_000) } });
    expect((await resendInvite(sess.owner, { membershipId: r.invited[0].membershipId })).ok).toBe(true);
    const mails = await sentTo(mail("again"));
    expect(mails).toHaveLength(2);
    expect((await getInviteInfo(oldLink)).status).toBe("invalid");
    expect((await getInviteInfo(mails.at(-1).link.split("/invite/")[1])).status).toBe("ok");
    await undoInvites(sess.owner, { batchId: r.batchId }); // already delivered, so it stays
  });
});

describe("accepting", () => {
  it("a new person chooses a name and password and joins; the link works once", async () => {
    const r = await send(sess.owner, { emails: [mail("join")] });
    await pastUndo();
    await deliverInvites(sess.owner, { batchId: r.batchId });
    const token = (await sentTo(mail("join")))[0].link.split("/invite/")[1];
    expect((await acceptWithNewAccount(token, { name: "", password: "a-long-password-1", termsAccepted: true })).errors.name).toBeTruthy();
    expect((await acceptWithNewAccount(token, { name: "Joan", password: "short", termsAccepted: true })).errors.password).toBeTruthy();
    expect((await acceptWithNewAccount(token, { name: "Joan", password: "a-long-password-1", termsAccepted: false })).errors.terms).toBeTruthy();
    const ok = await acceptWithNewAccount(token, { name: "Joan Doe", password: "a-long-password-1", termsAccepted: true });
    expect(ok).toMatchObject({ ok: true, roleCode: "MEMBER" });
    const m = await prisma.membership.findFirst({ where: { id: r.invited[0].membershipId }, include: { user: true } });
    expect(m).toMatchObject({ status: "ACTIVE" });
    expect(m.user).toMatchObject({ name: "Joan Doe" });
    expect(m.user.emailVerifiedAt).toBeTruthy();
    expect((await getInviteInfo(token)).status).toBe("accepted");
    expect((await acceptWithNewAccount(token, { name: "Joan", password: "a-long-password-1", termsAccepted: true })).status).toBe("accepted");
    expect((await prisma.auditEvent.findFirst({ where: { organizationId: A.id, action: "team.invite_accepted", entityId: m.id } })).summary).toBe(`Joan Doe joined ${A.name} as Member`);
  });

  it("someone with an account must be signed in as the invited email", async () => {
    const existing = await prisma.user.create({ data: { email: mail("exists"), name: "Exists", passwordHash: "x", emailVerifiedAt: new Date() } });
    const r = await send(sess.owner, { emails: [mail("exists")], apps: ["SOP"] });
    await pastUndo();
    await deliverInvites(sess.owner, { batchId: r.batchId });
    const token = (await sentTo(mail("exists")))[0].link.split("/invite/")[1];
    expect((await getInviteInfo(token)).hasAccount).toBe(true);
    expect((await acceptWithNewAccount(token, { name: "X", password: "a-long-password-1", termsAccepted: true })).errors.form).toMatch(/already has an account/);
    expect(await acceptSignedIn(token, { userId: ids.member.user.id, email: mail("member") })).toMatchObject({ ok: false, mismatch: mail("exists") });
    expect((await acceptSignedIn(token, { userId: existing.id, email: mail("exists") })).ok).toBe(true);
  });

  it("expired and taken-back invites show the right status and nothing can be accepted", async () => {
    const r = await send(sess.owner, { emails: [mail("old")], apps: ["SOP"] });
    await pastUndo();
    await deliverInvites(sess.owner, { batchId: r.batchId });
    const token = (await sentTo(mail("old")))[0].link.split("/invite/")[1];
    await prisma.invite.updateMany({ where: { membershipId: r.invited[0].membershipId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await getInviteInfo(token)).status).toBe("expired");
    expect((await acceptWithNewAccount(token, { name: "Old", password: "a-long-password-1", termsAccepted: true })).status).toBe("expired");
    await prisma.membership.update({ where: { id: r.invited[0].membershipId }, data: { status: "INACTIVE" } });
    expect((await getInviteInfo(token)).status).toBe("revoked");
    expect((await getInviteInfo("not-a-real-token-at-all-1234")).status).toBe("invalid");
  });
});

describe("one organization never touches another's invites", () => {
  it("cannot undo, deliver or resend invites from another organization", async () => {
    const r = await send(sess.owner, { emails: [mail("iso")], apps: ["SOP"] });
    expect(await undoInvites(sess.bOwner, { batchId: r.batchId })).toMatchObject({ ok: true, undone: 0 });
    await pastUndo();
    expect((await deliverInvites(sess.bOwner, { batchId: r.batchId })).sent).toBe(0);
    expect((await resendInvite(sess.bOwner, { membershipId: r.invited[0].membershipId })).ok).toBe(false);
    expect(await sentTo(mail("iso"))).toHaveLength(0);
    expect(await prisma.membership.count({ where: { organizationId: A.id, user: { email: mail("iso") } } })).toBe(1);
    await undoInvites(sess.owner, { batchId: r.batchId });
  });

  it("a person can only take back their own sends unless they are an admin", async () => {
    const r = await send(sess.mgr);
    await expect(undoInvites({ ...sess.member, role: "MANAGER" }, { batchId: r.batchId })).rejects.toBeInstanceOf(AccessError);
    expect((await undoInvites(sess.admin, { batchId: r.batchId })).undone).toBe(1);
  });
});
