import { ALL_APPS } from "./constants";
import { CLIENT_APPS, appByCode } from "@/lib/apps";
import { PRICES } from "@/lib/pricing";
import { formatMoney } from "@/lib/money";
import { emailSchema } from "@/lib/validators/auth";
import { appLabel, roleLabel } from "@/lib/labels";

/**
 * Rules for inviting people (05-team-invite-people.md). Pure, so the drawer in every theme and the server
 * Action agree on them and tests are simple.
 */

export const MAX_INVITES = 50;
export const INVITE_DAYS = 7;
export const NOTE_MAX = 300;
/** How long "Undo" works. The email is only sent after this. */
export const UNDO_SECONDS = 8;

/** Roles an inviter may offer. The owner is never offered. */
const INVITABLE = { OWNER: ["MEMBER", "MANAGER", "ACCOUNTANT", "ADMIN", "CLIENT"], ADMIN: ["MEMBER", "MANAGER", "ACCOUNTANT", "ADMIN", "CLIENT"], MANAGER: ["MEMBER"] };
export const invitableRoles = (viewerRole) => INVITABLE[viewerRole] ?? [];
export const canInvite = (viewerRole) => invitableRoles(viewerRole).length > 0;

export const ROLE_CARD_HELP = {
  MEMBER: "Works on tasks and clients they're given",
  MANAGER: "Also assigns work and sees their team's time",
  ACCOUNTANT: "Invoicing and Accounting, no people settings",
  ADMIN: "Manages people, clients and settings",
  CLIENT: "Sees only their own projects, documents and invoices",
};

const DEFAULT_APPS = {
  MEMBER: ["CRM"],
  MANAGER: ["CRM", "WORKDRIVE", "SOP"],
  ACCOUNTANT: ["INVOICING", "ACCOUNTING"],
  ADMIN: [...ALL_APPS],
  CLIENT: ["WORKDRIVE", "PROPOSALS"],
};
export const defaultApps = (role) => [...(DEFAULT_APPS[role] ?? [])];

/** Apps a role may be given: clients only portal apps. */
export const allowedApps = (role) => (role === "CLIENT" ? CLIENT_APPS : ALL_APPS);

/** The apps that will really be saved: admins get every app, clients only portal apps, others what was chosen. */
export function effectiveApps(role, chosen) {
  if (role === "ADMIN") return [...ALL_APPS];
  const allowed = allowedApps(role);
  return ALL_APPS.filter((a) => allowed.includes(a) && chosen.includes(a));
}

/** Clients do not use seats (07-Data-and-Permissions.md). */
export const usesSeats = (role) => role !== "CLIENT";

/** Splits pasted text into addresses: commas, semicolons, spaces and new lines all separate. Also reads "Name <a@b.com>". */
export function splitEmails(text) {
  return String(text ?? "")
    .split(/[\s,;]+/)
    .map((t) => t.replace(/^[<"'(]+|[>"',;)]+$/g, ""))
    .filter(Boolean);
}

/**
 * What to do with one typed address.
 * @param {string} raw
 * @param {Map<string, string>} existing  lower-case email -> membership status (active | invited | inactive)
 * @returns {{ email: string, state: "ok" | "invalid" | "member" | "inactive", message?: string }}
 */
export function classifyEmail(raw, existing) {
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) return { email: String(raw).trim().toLowerCase(), state: "invalid", message: "Check this address" };
  const email = parsed.data;
  const status = existing.get(email);
  if (status === "inactive") return { email, state: "inactive", message: "Was removed from your team" };
  if (status) return { email, state: "member", message: "Already in your team" };
  return { email, state: "ok" };
}

/** Seats still free per app after the people already in the organization. */
export const seatsLeft = (appUsage, seatLimit, app) => Math.max(seatLimit - (appUsage[app] ?? 0), 0);

/**
 * Seats this send needs. Returns the apps that are short, with how many seats are missing and what they cost.
 * @param {{ people: number, role: string, apps: string[], appUsage: Record<string, number>, seatLimit: number }} input
 */
export function seatCheck({ people, role, apps, appUsage, seatLimit }) {
  if (!usesSeats(role) || people === 0) return { ok: true, short: [], fewestLeft: null };
  const list = effectiveApps(role, apps);
  const short = [];
  let fewestLeft = null;
  for (const app of list) {
    const left = seatsLeft(appUsage, seatLimit, app);
    if (fewestLeft === null || left < fewestLeft.left) fewestLeft = { app, left };
    if (people > left) short.push({ app, missing: people - left, price: PRICES[app] ?? 0 });
  }
  return { ok: short.length === 0, short, fewestLeft };
}

/** "You need 1 more CRM seat. It costs $5.99 per person per month." */
export function shortSeatsMessage(short) {
  if (short.length === 0) return "";
  const parts = short.map((s) => `${s.missing} more ${appLabel(s.app)} ${s.missing === 1 ? "seat" : "seats"}`);
  const prices = short.filter((s) => s.price > 0).map((s) => `${appLabel(s.app)} costs ${formatMoney(s.price)}`);
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
  return `You need ${joined}.${prices.length ? ` ${prices.join(", ")} per person per month.` : ""}`;
}

/** The one-line summary under the form: "2 people · Member · 2 apps. Uses 2 of your 3 seats left. Invites expire after 7 days." */
export function summaryLine({ people, role, apps, appUsage, seatLimit }) {
  const list = effectiveApps(role, apps);
  const who = `${people} ${people === 1 ? "person" : "people"} · ${roleLabel(role)} · ${list.length} ${list.length === 1 ? "app" : "apps"}`;
  if (!usesSeats(role)) return `${who}. Client logins are free. Invites expire after ${INVITE_DAYS} days.`;
  const check = seatCheck({ people, role, apps, appUsage, seatLimit });
  if (!check.fewestLeft) return `${who}. Invites expire after ${INVITE_DAYS} days.`;
  if (people > check.fewestLeft.left) return `${who}. Needs ${people} ${appLabel(check.fewestLeft.app)} seats and ${check.fewestLeft.left} ${check.fewestLeft.left === 1 ? "is" : "are"} left.`;
  return `${who}. Uses ${people} of your ${check.fewestLeft.left} ${check.fewestLeft.left === 1 ? "seat" : "seats"} left. Invites expire after ${INVITE_DAYS} days.`;
}

/** Turns "anna.ruiz@example.com" into a starting name, "Anna Ruiz". The person sets their real name when they join. */
export function nameFromEmail(email) {
  const local = String(email).split("@")[0].replace(/[._+-]+/g, " ").replace(/\d+/g, " ").trim();
  const words = local.split(/\s+/).filter(Boolean).slice(0, 3);
  return words.length ? words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") : "New member";
}

export { appByCode };
