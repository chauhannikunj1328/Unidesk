import { prisma } from "./prisma.js";

export const WINDOW_MS = 15 * 60 * 1000;
export const LIMITS = { perEmail: 5, perIp: 20 };

/** Failed sign-ins in the window, counting only failures since the last success for that email. */
export async function failureCounts(email, ipHash, now = new Date()) {
  const windowStart = new Date(now.getTime() - WINDOW_MS);
  const lastSuccess = await prisma.loginAttempt.findFirst({ where: { email, success: true, createdAt: { gte: windowStart } }, orderBy: { createdAt: "desc" } });
  const since = lastSuccess ? lastSuccess.createdAt : windowStart;
  const [byEmail, byIp] = await Promise.all([
    prisma.loginAttempt.count({ where: { email, success: false, createdAt: { gt: since } } }),
    prisma.loginAttempt.count({ where: { ipHash, success: false, createdAt: { gte: windowStart } } }),
  ]);
  return { byEmail, byIp };
}

export async function isLocked(email, ipHash) {
  const { byEmail, byIp } = await failureCounts(email, ipHash);
  return byEmail >= LIMITS.perEmail || byIp >= LIMITS.perIp;
}

export const recordAttempt = (email, ipHash, success) => prisma.loginAttempt.create({ data: { email, ipHash, success } });

/** Public forms that send email (sign up, resend, forgot password): at most 10 per 15 minutes per network address. */
export const PUBLIC_FORM_LIMIT = 10;

/**
 * Counts one use of a public form and says whether it is allowed. Kept in LoginAttempt under the key "<kind>:<address hash>"
 * so no new table is needed. Over the limit, the caller should quietly do nothing and answer as if it worked.
 */
export async function allowPublicForm(kind, ipHash, now = new Date()) {
  const key = `${kind}:${ipHash}`;
  const used = await prisma.loginAttempt.count({ where: { email: key, createdAt: { gte: new Date(now.getTime() - WINDOW_MS) } } });
  if (used >= PUBLIC_FORM_LIMIT) return false;
  await prisma.loginAttempt.create({ data: { email: key, ipHash, success: false } });
  return true;
}
