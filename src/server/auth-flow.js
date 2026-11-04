import { prisma } from "./prisma.js";
import { hashPassword, verifyPassword } from "./passwords.js";
import { consumeToken, createToken, hashToken, peekToken, retireTokens } from "./tokens.js";
import { LIMITS, failureCounts, isLocked, recordAttempt } from "./rate-limit.js";
import { sendEmail, resetEmail, verifyEmail } from "./email.js";
import { writeAudit } from "./audit.js";
import { appUrl } from "./request.js";
import { passwordProblem } from "@/lib/validators/auth";

/**
 * Sign-in, sign-up, verification and password reset rules (Hub flow 01), with no Next.js request APIs,
 * so every rule can be tested directly. Server Actions and Auth.js call these.
 */

export const RESEND_COOLDOWN_SECONDS = 60;
const normEmail = (email) => String(email).trim().toLowerCase();

/** Writes an audit event in every organization the person is an active member of. */
async function auditForUser(userId, event) {
  const memberships = await prisma.membership.findMany({ where: { userId, status: "ACTIVE" } });
  for (const m of memberships) await writeAudit({ userId, orgId: m.organizationId }, event);
  return memberships.length;
}

/**
 * Checks an email and password. Reasons for refusing: "invalid", "locked", "unverified", "removed".
 * "unverified" and "removed" are only revealed after the correct password, so they cannot be used to find out who has an account.
 * @returns {Promise<{ ok: true, user: object } | { ok: false, reason: string, orgName?: string }>}
 */
export async function verifyCredentials(emailInput, password, ipHash) {
  const email = normEmail(emailInput);
  if (await isLocked(email, ipHash)) return { ok: false, reason: "locked" };

  const user = await prisma.user.findUnique({ where: { email } });
  const good = await verifyPassword(password, user?.passwordHash);

  if (!good) {
    await recordAttempt(email, ipHash, false);
    const { byEmail, byIp } = await failureCounts(email, ipHash);
    if (user && byEmail === LIMITS.perEmail) {
      await auditForUser(user.id, { action: "auth.lockout", entityType: "user", entityId: user.id, summary: `${LIMITS.perEmail} failed sign-in attempts for ${email}` });
    }
    return { ok: false, reason: byEmail >= LIMITS.perEmail || byIp >= LIMITS.perIp ? "locked" : "invalid" };
  }

  if (!user.emailVerifiedAt) return { ok: false, reason: "unverified" };

  const memberships = await prisma.membership.findMany({ where: { userId: user.id }, include: { organization: true }, orderBy: { createdAt: "desc" } });
  const hasActive = memberships.some((m) => m.status === "ACTIVE");
  const removedFrom = memberships.find((m) => m.status === "INACTIVE");
  if (memberships.length > 0 && !hasActive && removedFrom) return { ok: false, reason: "removed", orgName: removedFrom.organization.name };

  await recordAttempt(email, ipHash, true);
  return { ok: true, user };
}

/** Called after a successful sign-in: remember the organization and write the audit event. */
export async function afterSignIn(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const active = await prisma.membership.findMany({ where: { userId, status: "ACTIVE" }, orderBy: { createdAt: "asc" } });
  const last = active.find((m) => m.organizationId === user.lastOrganizationId) ?? active[0];
  if (last) {
    await prisma.user.update({ where: { id: userId }, data: { lastOrganizationId: last.organizationId } });
    await prisma.membership.update({ where: { id: last.id }, data: { lastActiveAt: new Date() } });
    await writeAudit({ userId, orgId: last.organizationId }, { action: "auth.login", entityType: "user", entityId: userId, summary: `${user.name} signed in` });
  }
  return last ?? null;
}

async function sendVerification(user) {
  await retireTokens(user.id, "VERIFY");
  const raw = await createToken(user.id, "VERIFY");
  const link = `${appUrl()}/hub/verify-email/confirm?token=${raw}`;
  await sendEmail({ to: user.email, link, ...verifyEmail(user.name.split(" ")[0], link) });
}

/**
 * Creates the account (the organization comes later, in onboarding) and sends the confirmation link.
 * @returns {Promise<{ ok: true } | { ok: false, errors: Record<string, string> }>}
 */
export async function registerUser({ name, email: emailInput, password, referralCode }) {
  const email = normEmail(emailInput);
  const problem = passwordProblem(password);
  if (problem) return { ok: false, errors: { password: problem } };
  if (await prisma.user.findUnique({ where: { email } })) return { ok: false, errors: { email: "An account with this email exists. Sign in instead." } };
  const user = await prisma.user.create({
    data: { name: name.trim(), email, passwordHash: await hashPassword(password), termsAcceptedAt: new Date(), signupReferralCode: referralCode || null },
  });
  await sendVerification(user);
  return { ok: true, userId: user.id };
}

/** Seconds until another confirmation email may be sent (0 when allowed now). */
export async function resendWaitSeconds(emailInput, now = new Date()) {
  const user = await prisma.user.findUnique({ where: { email: normEmail(emailInput) } });
  if (!user) return 0;
  const last = await prisma.emailToken.findFirst({ where: { userId: user.id, kind: "VERIFY" }, orderBy: { createdAt: "desc" } });
  if (!last) return 0;
  return Math.max(0, Math.ceil((last.createdAt.getTime() + RESEND_COOLDOWN_SECONDS * 1000 - now.getTime()) / 1000));
}

/** Sends a new confirmation link. Quietly does nothing for unknown or already confirmed emails, and inside the cooldown. */
export async function resendVerification(emailInput) {
  const email = normEmail(emailInput);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerifiedAt) return { ok: true, sent: false };
  if ((await resendWaitSeconds(email)) > 0) return { ok: true, sent: false };
  await sendVerification(user);
  return { ok: true, sent: true };
}

/** Uses a confirmation link: marks the email confirmed. status: "ok" | "expired" | "invalid". */
export async function confirmEmail(raw) {
  const r = await consumeToken(raw, "VERIFY");
  if (r.status !== "ok") return r;
  const user = await prisma.user.update({ where: { id: r.userId }, data: { emailVerifiedAt: new Date() } });
  return { status: "ok", user };
}

/** Always looks the same from outside. Sends a link only when the account exists (and not more than once a minute). */
export async function requestPasswordReset(emailInput) {
  const email = normEmail(emailInput);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: true };
  const recent = await prisma.emailToken.findFirst({ where: { userId: user.id, kind: "RESET", createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000) } } });
  if (recent) return { ok: true };
  await retireTokens(user.id, "RESET");
  const raw = await createToken(user.id, "RESET");
  const link = `${appUrl()}/hub/reset-password/${raw}`;
  await sendEmail({ to: user.email, link, ...resetEmail(user.name.split(" ")[0], link) });
  return { ok: true };
}

export const checkResetToken = (raw) => peekToken(raw, "RESET");

/** Looks at a confirmation link without using it, so mail scanners that open links cannot burn it. */
export const checkVerifyToken = (raw) => peekToken(raw, "VERIFY");

/** Sets a new password with a single-use link and signs out every older session. */
export async function resetPassword(raw, password) {
  const problem = passwordProblem(password);
  if (problem) return { ok: false, errors: { password: problem } };
  const r = await consumeToken(raw, "RESET");
  if (r.status !== "ok") return { ok: false, invalid: true };
  const user = await prisma.user.update({
    where: { id: r.userId },
    data: { passwordHash: await hashPassword(password), sessionsValidAfter: new Date() },
  });
  if (!user.emailVerifiedAt) await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } }); // the link proved the inbox
  await prisma.loginAttempt.deleteMany({ where: { email: user.email } }); // a reset clears a lockout
  await auditForUser(user.id, { action: "auth.password_reset", entityType: "user", entityId: user.id, summary: `${user.name} reset their password` });
  return { ok: true };
}

/** Who is landing after sign-in, from the database (the new cookie is not readable yet in the same request). */
export async function identityByEmail(emailInput) {
  const user = await prisma.user.findUnique({ where: { email: normEmail(emailInput) } });
  if (!user) return { orgId: null, role: null };
  const list = await prisma.membership.findMany({ where: { userId: user.id, status: "ACTIVE" }, orderBy: { createdAt: "asc" } });
  const m = list.find((x) => x.organizationId === user.lastOrganizationId) ?? list[0];
  return m ? { orgId: m.organizationId, role: m.role } : { orgId: null, role: null };
}

/** After a confirmation link signs someone in: where they should land. The token row is kept, so it can still be looked up. */
export async function identityForVerifyToken(raw) {
  const row = await prisma.emailToken.findUnique({ where: { tokenHash: hashToken(String(raw)) }, include: { user: true } });
  return identityByEmail(row?.user.email ?? "");
}
