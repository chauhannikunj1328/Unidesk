import { ROLES } from "./constants";

/**
 * What each role can do (07-Data-and-Permissions.md, as the app really enforces it). Read-only: roles are changed per
 * person on the People page. Values: true, false, or a short phrase for a limited yes.
 * One list feeds the Roles tab (glass, grove) and the Roles drawer (pastel), so they never disagree.
 */
export const ROLE_ORDER = ROLES;

/** @type {{ id: string, label: string, hint?: string, values: Record<string, boolean | string> }[]} */
export const CAPABILITIES = [
  { id: "billing", label: "Change billing or delete the organization", values: { OWNER: true, ADMIN: false, MANAGER: false, ACCOUNTANT: false, MEMBER: false, CLIENT: false } },
  { id: "invite", label: "Invite people", hint: "Managers invite Members who then report to them", values: { OWNER: true, ADMIN: true, MANAGER: "Members only", ACCOUNTANT: false, MEMBER: false, CLIENT: false } },
  { id: "roles", label: "Change roles and who reports to whom", values: { OWNER: true, ADMIN: true, MANAGER: false, ACCOUNTANT: false, MEMBER: false, CLIENT: false } },
  { id: "access", label: "Change which apps a person can open", values: { OWNER: true, ADMIN: true, MANAGER: "Their reports", ACCOUNTANT: false, MEMBER: false, CLIENT: false } },
  { id: "shared", label: "Choose which apps read contacts, clients and projects", values: { OWNER: true, ADMIN: true, MANAGER: false, ACCOUNTANT: false, MEMBER: false, CLIENT: false } },
  { id: "invites", label: "Resend and revoke invites", values: { OWNER: true, ADMIN: true, MANAGER: "Their own", ACCOUNTANT: false, MEMBER: false, CLIENT: false } },
  { id: "clients", label: "Create and edit clients and projects", values: { OWNER: true, ADMIN: true, MANAGER: true, ACCOUNTANT: true, MEMBER: false, CLIENT: false } },
  { id: "apps", label: "Work in an app", hint: "Only in the apps they can open", values: { OWNER: "All apps", ADMIN: "Apps they can open", MANAGER: "Apps they can open", ACCOUNTANT: "Apps they can open", MEMBER: "Apps they can open", CLIENT: "Client portal only" } },
  { id: "others", label: "See the time and work of others", values: { OWNER: true, ADMIN: true, MANAGER: "Their reports", ACCOUNTANT: false, MEMBER: false, CLIENT: false } },
  { id: "money", label: "Invoicing and Accounting money actions", values: { OWNER: true, ADMIN: true, MANAGER: false, ACCOUNTANT: true, MEMBER: false, CLIENT: false } },
  { id: "audit", label: "Read the audit log", values: { OWNER: true, ADMIN: true, MANAGER: false, ACCOUNTANT: false, MEMBER: false, CLIENT: false } },
];

/** How many people hold each role (everyone who is not deactivated). */
export function roleHeadcount(members) {
  const out = Object.fromEntries(ROLE_ORDER.map((r) => [r, 0]));
  for (const m of members) if (m.status !== "inactive" && m.role in out) out[m.role] += 1;
  return out;
}

export const rolesTabCount = ROLE_ORDER.length;
