/** Plain-language labels for internal codes. The UI never shows a raw code. */

const ACTIONS = {
  "auth.login": "Signed in",
  "auth.logout": "Signed out",
  "client.created": "Added a client",
  "client.updated": "Updated a client",
  "client.archived": "Archived a client",
  "project.created": "Added a project",
  "team.invited": "Invited a person",
  "team.invite_undone": "Took back an invite",
  "team.invite_resent": "Resent an invite",
  "team.invite_accepted": "Joined the team",
  "team.role_changed": "Changed a role",
};

const ROLES = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  ACCOUNTANT: "Accountant",
  MEMBER: "Member",
  CLIENT: "Client",
};

const APPS = {
  PROPOSALS: "Proposals",
  APPOINTMENT: "Appointment",
  CRM: "CRM",
  WORKDRIVE: "Workdrive",
  SOP: "SOP",
  INVOICING: "Invoicing",
  ACCOUNTING: "Accounting",
};

export const roleLabel = (code) => ROLES[code] ?? "Unknown role";
export const appLabel = (code) => APPS[code] ?? "Unknown app";
export const actionLabel = (code) => ACTIONS[code] ?? "Made a change";
