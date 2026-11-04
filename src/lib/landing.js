import { safeNext } from "./safe-next.js";

/**
 * Where a person lands after signing in (Hub flow 01).
 * No active organization: onboarding. Client role: the client portal. Everyone else: `next` if it is safe, else the Hub.
 * @param {{ orgId?: string | null, role?: string | null }} identity
 * @param {string | null | undefined} next
 */
export function landingFor(identity, next) {
  if (!identity?.orgId) return "/hub/onboarding?step=1";
  if (identity.role === "CLIENT") return "/portal";
  return safeNext(next, "/hub");
}
