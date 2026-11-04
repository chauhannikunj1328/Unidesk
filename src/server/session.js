import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "./auth.js";
import { prisma } from "./prisma.js";
import { loadValidUser } from "./session-check.js";

/**
 * The signed-in person, checked against the database on every request, so removing someone or resetting a
 * password signs them out at once even though the cookie itself is still valid.
 * Returns null when signed out, expired, signed out by a password reset, or removed from every organization.
 */
export const getIdentity = cache(async () => {
  const s = await auth();
  if (!s?.userId) return null;
  const user = await loadValidUser({ userId: s.userId, expiresAt: s.expiresAt, iat: s.issuedAt });
  if (!user) return null;
  return { user, preferredOrgId: s.orgId ?? user.lastOrganizationId };
});

/**
 * The person plus their active organization, or null when signed out or they have no organization yet.
 * @returns {Promise<(import("./db.js").Session & { name: string, email: string, orgName: string, membershipId: string, timezone: string }) | null>}
 */
export const getSession = cache(async () => {
  const identity = await getIdentity();
  if (!identity) return null;
  const list = await prisma.membership.findMany({
    where: { userId: identity.user.id, status: "ACTIVE" },
    include: { organization: true, appAccess: true },
    orderBy: { createdAt: "asc" },
  });
  const m = list.find((x) => x.organizationId === identity.preferredOrgId) ?? list[0];
  if (!m) return null;
  return {
    userId: identity.user.id,
    name: identity.user.name,
    email: identity.user.email,
    orgId: m.organizationId,
    orgName: m.organization.name,
    timezone: m.organization.timezone,
    membershipId: m.id,
    role: m.role,
    apps: m.appAccess.map((a) => a.app),
  };
});

/** Where this person should land if they open the site now. */
export async function landingIdentity() {
  const s = await getSession();
  if (s) return { orgId: s.orgId, role: s.role };
  return (await getIdentity()) ? { orgId: null, role: null } : null;
}

/**
 * For pages: the session, or a redirect. A cookie can still pass the middleware after a password reset or removal,
 * so a page must never assume getSession() returned something.
 */
export async function requireSession() {
  const s = await getSession();
  if (s) return s;
  redirect((await getIdentity()) ? "/hub/onboarding?step=1" : "/hub/sign-in");
}
