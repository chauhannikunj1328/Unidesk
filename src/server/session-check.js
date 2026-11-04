import { prisma } from "./prisma.js";

/**
 * One rule for "is this session token still good?", used by the Auth.js jwt callback (so the session endpoint cannot
 * re-issue a dead cookie) and by getIdentity() (so every page checks too).
 * Returns the user, or null when the token must be refused: unknown user, idle or expired, issued before a password
 * reset, or removed from every organization.
 * @param {{ userId?: string, expiresAt?: number, iat?: number } | null | undefined} token  iat in seconds, expiresAt in milliseconds
 */
export async function loadValidUser(token, now = Date.now()) {
  if (!token?.userId) return null;
  if (token.expiresAt && token.expiresAt < now) return null;
  const user = await prisma.user.findUnique({ where: { id: token.userId } });
  if (!user) return null;
  if (user.sessionsValidAfter && (token.iat ?? 0) * 1000 < user.sessionsValidAfter.getTime()) return null;
  const memberships = await prisma.membership.findMany({ where: { userId: user.id }, select: { status: true } });
  if (memberships.length > 0 && !memberships.some((m) => m.status === "ACTIVE") && memberships.some((m) => m.status === "INACTIVE")) return null;
  return user;
}
