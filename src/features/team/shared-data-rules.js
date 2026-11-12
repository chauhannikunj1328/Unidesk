import { APP_LIST } from "@/lib/apps";

/**
 * Shared data (Hub flow 09): which apps may read the organization's contacts, clients and projects.
 * Pure rules, shared by the server and every theme, so the screens and the saved data always agree.
 */

export const DATA_TYPES = ["contacts", "clients", "projects"];
export const DATA_LABELS = { contacts: "Contacts", clients: "Clients", projects: "Projects" };

export const APP_DESCRIPTIONS = {
  PROPOSALS: "Proposals and e-signatures",
  APPOINTMENT: "Booking and scheduling",
  CRM: "Tasks, projects and time",
  WORKDRIVE: "Documents and compliance",
  SOP: "Process guides and training",
  INVOICING: "Invoices and payments",
  ACCOUNTING: "Bookkeeping and reports",
};

/** What a new organization starts with (the spec's proposal; to confirm with the client). */
export const DEFAULTS = {
  PROPOSALS: { contacts: true, clients: true, projects: false },
  APPOINTMENT: { contacts: true, clients: true, projects: false },
  CRM: { contacts: true, clients: true, projects: true },
  WORKDRIVE: { contacts: false, clients: true, projects: true },
  SOP: { contacts: false, clients: true, projects: false },
  INVOICING: { contacts: true, clients: true, projects: true },
  ACCOUNTING: { contacts: false, clients: true, projects: true },
};

/** What stops working when an app loses a kind of data. Shown in the confirmation before turning it off. */
export const CONSEQUENCE = {
  PROPOSALS: { contacts: "Proposals will no longer suggest your contacts as recipients.", clients: "Proposals can no longer be linked to clients.", projects: "Proposals will no longer show projects." },
  APPOINTMENT: { contacts: "Appointment will no longer match bookings to your contacts.", clients: "Appointment will no longer match bookings to clients.", projects: "Appointment will no longer show projects." },
  CRM: { contacts: "CRM will no longer show your contacts.", clients: "CRM can no longer link tasks and time to clients.", projects: "CRM will no longer list projects for tasks and time." },
  WORKDRIVE: { contacts: "Workdrive will no longer show your contacts.", clients: "Workdrive will no longer show client folders.", projects: "Workdrive will no longer organise files by project." },
  SOP: { contacts: "SOP will no longer show your contacts.", clients: "SOP will no longer show client folders. Existing SOPs keep their client label.", projects: "SOP will no longer show projects." },
  INVOICING: { contacts: "Invoicing will no longer offer your contacts as invoice recipients.", clients: "Invoicing can't send invoices without clients.", projects: "Invoicing can no longer bill time by project." },
  ACCOUNTING: { contacts: "Accounting will no longer show your contacts.", clients: "Accounting can't show receivables without clients.", projects: "Accounting will no longer report by project." },
};

/** Apps that cannot do their main job without clients: they keep a warning under the row while Clients is off. */
export const NEEDS_CLIENTS = ["PROPOSALS", "WORKDRIVE", "CRM", "INVOICING", "ACCOUNTING"];

export const PROJECTS_NEED_CLIENTS = "Projects need Clients, so Projects were turned off too.";
export const CLIENTS_FOR_PROJECTS = "Projects need Clients, so Clients were turned on too.";

export const defaultsFor = (app) => ({ ...DEFAULTS[app] });
export const countOn = (settings) => DATA_TYPES.filter((t) => settings[t]).length;
export const sameSettings = (a, b) => DATA_TYPES.every((t) => a[t] === b[t]);

/**
 * One switch changes. Projects need Clients both ways: Clients off turns Projects off; Projects on turns Clients on.
 * @returns {{ next: {contacts:boolean,clients:boolean,projects:boolean}, note: string | null }}
 */
export function applyChange(current, type, enabled) {
  const next = { ...current, [type]: enabled };
  let note = null;
  if (type === "clients" && !enabled && current.projects) { next.projects = false; note = PROJECTS_NEED_CLIENTS; }
  if (type === "projects" && enabled && !current.clients) { next.clients = true; note = CLIENTS_FOR_PROJECTS; }
  return { next, note };
}

/** What to ask before turning something off, or null when no question is needed. */
export function confirmationFor(app, type, current) {
  if (!current[type]) return null;
  const label = APP_LIST.find((a) => a.code === app)?.label ?? app;
  const lines = [CONSEQUENCE[app]?.[type]];
  if (type === "clients" && current.projects) lines.push("Projects will be turned off too.");
  return { title: `Stop ${label} reading ${DATA_LABELS[type].toLowerCase()}?`, consequence: lines.filter(Boolean).join(" ") };
}

/** "Proposals can now read contacts" / "SOP can no longer read clients". */
export function toastText(appLabel, type, enabled, note) {
  const what = DATA_LABELS[type].toLowerCase();
  return `${appLabel} can ${enabled ? "now" : "no longer"} read ${what}.${note ? ` ${note}` : ""}`;
}

/** The warning under a row, or null. */
export function rowWarning(app, settings) {
  return !settings.clients && NEEDS_CLIENTS.includes(app) ? CONSEQUENCE[app].clients : null;
}
