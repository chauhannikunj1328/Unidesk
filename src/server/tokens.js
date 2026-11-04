import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";

export const TOKEN_TTL_MS = { VERIFY: 24 * 3600 * 1000, RESET: 3600 * 1000 };

export const hashToken = (raw) => createHash("sha256").update(raw).digest("hex");

/** Makes a single-use link token. Only its hash is stored. Returns the raw token for the email. */
export async function createToken(userId, kind) {
  const raw = randomBytes(32).toString("base64url");
  await prisma.emailToken.create({
    data: { userId, kind, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + TOKEN_TTL_MS[kind]) },
  });
  return raw;
}

/** Looks at a token without using it. status: "ok" | "expired" | "invalid" (unknown, used, or wrong kind). */
export async function peekToken(raw, kind) {
  if (typeof raw !== "string" || raw.length < 20 || raw.length > 200) return { status: "invalid" };
  const row = await prisma.emailToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!row || row.kind !== kind || row.usedAt) return { status: "invalid" };
  if (row.expiresAt < new Date()) return { status: "expired", userId: row.userId };
  return { status: "ok", userId: row.userId, id: row.id };
}

/** Uses a token exactly once. A second call, or a parallel one, gets "invalid". */
export async function consumeToken(raw, kind) {
  const peek = await peekToken(raw, kind);
  if (peek.status !== "ok") return peek;
  const used = await prisma.emailToken.updateMany({ where: { id: peek.id, usedAt: null }, data: { usedAt: new Date() } });
  return used.count === 1 ? peek : { status: "invalid" };
}

/** Marks every unused token of this kind for this person as used, before a new one is issued. */
export const retireTokens = (userId, kind) =>
  prisma.emailToken.updateMany({ where: { userId, kind, usedAt: null }, data: { usedAt: new Date() } });
