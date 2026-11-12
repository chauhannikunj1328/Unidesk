import { prisma } from "@/server/prisma";
import { writeAudit } from "@/server/audit";
import { hashToken } from "@/server/tokens";
import { hashPassword } from "@/server/passwords";
import { passwordProblem } from "@/lib/validators/auth";
import { roleLabel } from "@/lib/labels";

/**
 * Accepting an invite (05-team-invite-people.md, /invite/[token]). No signed-in organization exists yet here,
 * so the link token is the proof. Plain objects out: { status, ... } or { ok, ... }.
 */

const lookup = (raw) =>
  typeof raw === "string" && raw.length >= 20 && raw.length <= 200
    ? prisma.invite.findUnique({ where: { tokenHash: hashToken(raw) }, include: { membership: { include: { user: true, organization: true } } } })
    : null;

/**
 * What the invite page shows. status: "ok" | "expired" | "revoked" | "accepted" | "invalid".
 * @returns {Promise<{ status: string, orgName?: string, inviterName?: string, role?: string, roleCode?: string, email?: string, name?: string, hasAccount?: boolean, note?: string | null }>}
 */
export async function getInviteInfo(raw) {
  const invite = await lookup(raw);
  if (!invite) return { status: "invalid" };
  const inviter = await prisma.membership.findUnique({ where: { id: invite.invitedById }, include: { user: true } });
  const base = {
    orgName: invite.membership.organization.name,
    inviterName: inviter?.user.name ?? "A teammate",
    role: roleLabel(invite.membership.role),
    roleCode: invite.membership.role,
    email: invite.email,
    name: invite.membership.user.name,
    hasAccount: Boolean(invite.membership.user.passwordHash),
    note: invite.note,
  };
  if (invite.status === "ACCEPTED") return { status: "accepted", ...base };
  // A removed or taken-back invite is the same to the person holding the link.
  if (invite.status === "REVOKED" || invite.membership.status !== "INVITED") return { status: "revoked", ...base };
  if (invite.expiresAt < new Date()) return { status: "expired", ...base };
  return { status: "ok", ...base };
}

async function activate(invite, userId) {
  const m = invite.membership;
  const claimed = await prisma.invite.updateMany({ where: { id: invite.id, status: "PENDING" }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
  if (claimed.count !== 1) return false; // a second tap or a parallel request
  await prisma.membership.update({ where: { id: m.id }, data: { status: "ACTIVE", joinedAt: new Date(), lastActiveAt: new Date() } });
  await prisma.user.update({ where: { id: userId }, data: { lastOrganizationId: m.organizationId } });
  await writeAudit({ userId, orgId: m.organizationId }, {
    action: "team.invite_accepted", entityType: "membership", entityId: m.id,
    summary: `${m.user.name} joined ${m.organization.name} as ${roleLabel(m.role)}`,
  });
  return true;
}

/** The person has no password yet: they choose a name and password, which also proves the inbox. */
export async function acceptWithNewAccount(raw, { name, password, termsAccepted }) {
  const info = await getInviteInfo(raw);
  if (info.status !== "ok") return { ok: false, status: info.status };
  if (info.hasAccount) return { ok: false, errors: { form: "This email already has an account. Sign in to accept." } };
  const cleanName = String(name ?? "").trim();
  if (!cleanName) return { ok: false, errors: { name: "Enter your name" } };
  const problem = passwordProblem(password);
  if (problem) return { ok: false, errors: { password: problem } };
  if (termsAccepted !== true) return { ok: false, errors: { terms: "Tick this box to continue." } };
  const invite = await lookup(raw);
  const userId = invite.membership.userId;
  const now = new Date();
  await prisma.user.update({ where: { id: userId }, data: { name: cleanName.slice(0, 120), passwordHash: await hashPassword(password), emailVerifiedAt: now, termsAcceptedAt: now } });
  invite.membership.user.name = cleanName;
  if (!(await activate(invite, userId))) return { ok: false, status: "accepted" };
  return { ok: true, email: invite.email, roleCode: invite.membership.role };
}

/** The person is signed in with the invited email. */
export async function acceptSignedIn(raw, { userId, email }) {
  const info = await getInviteInfo(raw);
  if (info.status !== "ok") return { ok: false, status: info.status };
  if (info.email !== String(email).toLowerCase()) return { ok: false, mismatch: info.email };
  const invite = await lookup(raw);
  if (invite.membership.userId !== userId) return { ok: false, mismatch: info.email };
  if (!(await activate(invite, userId))) return { ok: false, status: "accepted" };
  return { ok: true, roleCode: invite.membership.role };
}
