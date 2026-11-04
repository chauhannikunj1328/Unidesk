import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/prisma";
import { hashPassword } from "@/server/passwords";
import { hashToken } from "@/server/tokens";
import { LIMITS } from "@/server/rate-limit";
import { checkResetToken, checkVerifyToken, confirmEmail, registerUser, requestPasswordReset, resendVerification, resendWaitSeconds, resetPassword, verifyCredentials, afterSignIn } from "@/server/auth-flow";

/** Builds its own people and organization and removes them afterwards. The demo data is never touched. */
const stamp = Date.now();
const mail = (k) => `${k}-${stamp}@flow.test`;
const PW = "a-Good-passphrase-7";
let org, ok, unverified, removed, noOrg;
let ipCounter = 0;
const ip = () => `ip-${stamp}-${++ipCounter}`;

async function lastLink(to, template) {
  const row = await prisma.emailLog.findFirst({ where: { to, template }, orderBy: { createdAt: "desc" } });
  return row?.link ?? null;
}
const tokenFrom = (link) => link.split("token=").pop().split("/").pop();

beforeAll(async () => {
  org = await prisma.organization.create({ data: { name: `Flow Org ${stamp}` } });
  const hash = await hashPassword(PW);
  const mk = (k, extra = {}) => prisma.user.create({ data: { email: mail(k), name: `User ${k}`, passwordHash: hash, emailVerifiedAt: new Date(), ...extra } });
  ok = await mk("ok");
  unverified = await mk("unverified", { emailVerifiedAt: null });
  removed = await mk("removed");
  noOrg = await mk("noorg");
  await prisma.membership.create({ data: { userId: ok.id, organizationId: org.id, role: "ADMIN", status: "ACTIVE" } });
  await prisma.membership.create({ data: { userId: removed.id, organizationId: org.id, role: "MEMBER", status: "INACTIVE" } });
});

afterAll(async () => {
  await prisma.auditEvent.deleteMany({ where: { organizationId: org.id } });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.loginAttempt.deleteMany({ where: { email: { endsWith: `-${stamp}@flow.test` } } });
  await prisma.emailLog.deleteMany({ where: { to: { endsWith: `-${stamp}@flow.test` } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${stamp}@flow.test` } } });
  await prisma.$disconnect();
});

describe("sign in", () => {
  it("accepts the right password", async () => {
    const r = await verifyCredentials(mail("ok").toUpperCase(), PW, ip());
    expect(r.ok).toBe(true);
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const a = await verifyCredentials(mail("ok"), "wrong-password-1", ip());
    const b = await verifyCredentials(mail("ghost"), "wrong-password-1", ip());
    expect(a).toEqual({ ok: false, reason: "invalid" });
    expect(b).toEqual({ ok: false, reason: "invalid" });
  });

  it("tells an unconfirmed email to confirm, but only after the correct password", async () => {
    expect((await verifyCredentials(mail("unverified"), PW, ip())).reason).toBe("unverified");
    expect((await verifyCredentials(mail("unverified"), "wrong-password-1", ip())).reason).toBe("invalid");
  });

  it("tells a removed member their access was removed, naming the organization, only after the correct password", async () => {
    const r = await verifyCredentials(mail("removed"), PW, ip());
    expect(r).toMatchObject({ ok: false, reason: "removed", orgName: org.name });
    expect((await verifyCredentials(mail("removed"), "wrong-password-1", ip())).reason).toBe("invalid");
  });

  it("lets someone with no organization yet in (they go to onboarding)", async () => {
    expect((await verifyCredentials(mail("noorg"), PW, ip())).ok).toBe(true);
  });

  it("locks an email after 5 failures, refuses even the right password, and writes an audit event", async () => {
    const target = mail("ok");
    await prisma.loginAttempt.deleteMany({ where: { email: target } });
    const from = ip();
    for (let i = 1; i < LIMITS.perEmail; i++) expect((await verifyCredentials(target, "wrong-password-1", from)).reason).toBe("invalid");
    expect((await verifyCredentials(target, "wrong-password-1", from)).reason).toBe("locked"); // the 5th failure shows the lockout
    expect((await verifyCredentials(target, PW, ip())).reason).toBe("locked"); // right password, other address: still refused
    const events = await prisma.auditEvent.findMany({ where: { organizationId: org.id, action: "auth.lockout" } });
    expect(events.map((e) => e.summary)).toContain(`5 failed sign-in attempts for ${target}`);
    await prisma.loginAttempt.deleteMany({ where: { email: target } });
  });

  it("locks an address after 20 failures across emails", async () => {
    const from = ip();
    for (let i = 0; i < LIMITS.perIp; i++) await verifyCredentials(`spray${i}-${stamp}@flow.test`, "wrong-password-1", from);
    expect((await verifyCredentials(mail("ok"), PW, from)).reason).toBe("locked");
    expect((await verifyCredentials(mail("ok"), PW, ip())).ok).toBe(true); // a different address is fine
  });

  it("writes 'signed in' to the audit log and remembers the organization", async () => {
    const m = await afterSignIn(ok.id);
    expect(m.organizationId).toBe(org.id);
    expect((await prisma.user.findUnique({ where: { id: ok.id } })).lastOrganizationId).toBe(org.id);
    const events = await prisma.auditEvent.findMany({ where: { organizationId: org.id, action: "auth.login" } });
    expect(events.at(-1).summary).toBe("User ok signed in");
  });
});

describe("sign up and email confirmation", () => {
  const email = mail("new");
  it("creates the account, stores the terms time and referral code, and emails a link", async () => {
    const r = await registerUser({ name: "New Person", email, password: PW, referralCode: "PAULSMITH" });
    expect(r.ok).toBe(true);
    const u = await prisma.user.findUnique({ where: { email } });
    expect(u.emailVerifiedAt).toBeNull();
    expect(u.termsAcceptedAt).not.toBeNull();
    expect(u.signupReferralCode).toBe("PAULSMITH");
    expect(u.passwordHash).not.toContain(PW);
    expect(await lastLink(email, "verify-email")).toContain("/hub/verify-email/confirm?token=");
  });
  it("says so when the email is already registered", async () => {
    const r = await registerUser({ name: "Again", email: email.toUpperCase(), password: PW });
    expect(r).toEqual({ ok: false, errors: { email: "An account with this email exists. Sign in instead." } });
  });
  it("refuses a weak password", async () => {
    const r = await registerUser({ name: "Weak", email: mail("weak"), password: "short" });
    expect(r.errors.password).toMatch(/at least 10/);
    expect(await prisma.user.findUnique({ where: { email: mail("weak") } })).toBeNull();
  });
  it("stores only a hash of the link token", async () => {
    const raw = tokenFrom(await lastLink(email, "verify-email"));
    expect(await prisma.emailToken.count({ where: { tokenHash: raw } })).toBe(0);
    expect(await prisma.emailToken.count({ where: { tokenHash: hashToken(raw) } })).toBe(1);
  });
  it("enforces a 60 second wait before another email", async () => {
    expect(await resendWaitSeconds(email)).toBeGreaterThan(50);
    expect((await resendVerification(email)).sent).toBe(false);
    await prisma.emailToken.updateMany({ where: { user: { email } }, data: { createdAt: new Date(Date.now() - 61000) } });
    expect(await resendWaitSeconds(email)).toBe(0);
    expect((await resendVerification(email)).sent).toBe(true);
  });
  it("looking at a confirmation link does not use it (mail scanners)", async () => {
    const e = mail("scan");
    await registerUser({ name: "Scan", email: e, password: PW });
    const raw = tokenFrom(await lastLink(e, "verify-email"));
    expect((await checkVerifyToken(raw)).status).toBe("ok");
    expect((await checkVerifyToken(raw)).status).toBe("ok");
    expect((await prisma.user.findUnique({ where: { email: e } })).emailVerifiedAt).toBeNull();
    expect((await confirmEmail(raw)).status).toBe("ok"); // still works for the real person
    expect((await checkVerifyToken(raw)).status).toBe("invalid");
  });
  it("confirms once, then the same link is invalid", async () => {
    const raw = tokenFrom(await lastLink(email, "verify-email"));
    const first = await confirmEmail(raw);
    expect(first.status).toBe("ok");
    expect((await prisma.user.findUnique({ where: { email } })).emailVerifiedAt).not.toBeNull();
    expect((await confirmEmail(raw)).status).toBe("invalid");
  });
  it("an old link stops working when a newer one is sent", async () => {
    const e = mail("twice");
    await registerUser({ name: "Twice", email: e, password: PW });
    const old = tokenFrom(await lastLink(e, "verify-email"));
    await prisma.emailToken.updateMany({ where: { user: { email: e } }, data: { createdAt: new Date(Date.now() - 61000) } });
    await resendVerification(e);
    expect((await confirmEmail(old)).status).toBe("invalid");
    expect((await confirmEmail(tokenFrom(await lastLink(e, "verify-email")))).status).toBe("ok");
  });
  it("reports an expired link as expired", async () => {
    const e = mail("late");
    await registerUser({ name: "Late", email: e, password: PW });
    const raw = tokenFrom(await lastLink(e, "verify-email"));
    await prisma.emailToken.updateMany({ where: { tokenHash: hashToken(raw) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await confirmEmail(raw)).status).toBe("expired");
  });
  it("rejects junk tokens", async () => {
    for (const junk of ["", "short", "x".repeat(300), null, undefined]) expect((await confirmEmail(junk)).status).toBe("invalid");
  });
});

describe("forgot and reset password", () => {
  const email = mail("ok");
  beforeEach(async () => { await prisma.emailToken.updateMany({ where: { user: { email } }, data: { createdAt: new Date(Date.now() - 120000) } }); });

  it("gives the same answer whether or not the account exists, and only emails real accounts", async () => {
    const before = await prisma.emailLog.count({ where: { to: mail("nobody") } });
    expect(await requestPasswordReset(mail("nobody"))).toEqual({ ok: true });
    expect(await requestPasswordReset(email)).toEqual({ ok: true });
    expect(await prisma.emailLog.count({ where: { to: mail("nobody") } })).toBe(before);
    expect(await lastLink(email, "reset-password")).toContain("/hub/reset-password/");
  });
  it("resets once with a good password, signs out older sessions, and writes an audit event", async () => {
    const raw = tokenFrom(await lastLink(email, "reset-password"));
    expect((await checkResetToken(raw)).status).toBe("ok");
    const weak = await resetPassword(raw, "short");
    expect(weak.errors.password).toMatch(/at least 10/);
    expect((await checkResetToken(raw)).status).toBe("ok"); // a weak attempt does not burn the link
    const before = new Date();
    expect(await resetPassword(raw, "another-Strong-pass-9")).toEqual({ ok: true });
    const u = await prisma.user.findUnique({ where: { email } });
    expect(u.sessionsValidAfter.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect((await verifyCredentials(email, "another-Strong-pass-9", ip())).ok).toBe(true);
    expect((await verifyCredentials(email, PW, ip())).reason).toBe("invalid");
    expect(await resetPassword(raw, "yet-Another-pass-10")).toEqual({ ok: false, invalid: true }); // single use
    const events = await prisma.auditEvent.findMany({ where: { organizationId: org.id, action: "auth.password_reset" } });
    expect(events.at(-1).summary).toBe("User ok reset their password");
  });
  it("rejects expired and unknown reset links", async () => {
    await prisma.emailToken.updateMany({ where: { user: { email } }, data: { createdAt: new Date(Date.now() - 120000) } });
    await requestPasswordReset(email);
    const raw = tokenFrom(await lastLink(email, "reset-password"));
    await prisma.emailToken.updateMany({ where: { tokenHash: hashToken(raw) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await checkResetToken(raw)).status).toBe("expired");
    expect(await resetPassword(raw, "a-Fresh-Strong-pass-11")).toEqual({ ok: false, invalid: true });
    expect((await checkResetToken("definitely-not-a-real-token-value")).status).toBe("invalid");
  });
  it("a verify link cannot be used as a reset link", async () => {
    const e = mail("cross");
    await registerUser({ name: "Cross", email: e, password: PW });
    const verifyRaw = tokenFrom(await lastLink(e, "verify-email"));
    expect((await checkResetToken(verifyRaw)).status).toBe("invalid");
  });
});
