import { safeNext } from "./safe-next.js";

/**
 * Where a person lands after signing in (Hub flow 01).
 * No active organization: onboarding. Client role: the client portal. Everyone else: `next` if it is safe, else the Hub.
 * @param {{ orgId?: string | null, role?: string | null }} identity
 * @param {string | null | undefined} next
 */
export function landingFor(identity, next) {
  // Someone signing in to accept an invite has no organization yet; send them back to the invite, not to onboarding.
  if (typeof next === "string" && /^\/invite\/[\w-]{20,200}$/.test(next)) return next;
  if (!identity?.orgId) return "/hub/onboarding?step=1";
  if (identity.role === "CLIENT") return "/portal";
  return safeNext(next, "/hub");
}
