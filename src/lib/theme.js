import { cookies } from "next/headers";

export const THEMES = ["glass", "pastel", "grove"];

/** Phase 0 and pilot: theme from a cookie. Hub flow 24 reads user.theme and organization.defaultTheme instead. */
export async function getTheme() {
  const value = (await cookies()).get("theme")?.value;
  return THEMES.includes(value) ? value : "glass";
}

/**
 * Auth pages use glass, or the organization's theme once an invite link carries one (Hub flow 05).
 * In development the theme switcher still applies, so all three structures can be reviewed.
 */
export async function getAuthTheme() {
  return process.env.NODE_ENV === "production" ? "glass" : getTheme();
}
