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
  "team.deactivated": "Deactivated a person",
  "team.reactivated": "Reactivated a person",
  "team.removed": "Removed a person",
  "team.ownership_transferred": "Transferred ownership",
  "team.shared_data_on": "Let an app read shared data",
  "team.shared_data_off": "Stopped an app reading shared data",
  "team.invite_revoked": "Revoked an invite",
  "team.invite_link_copied": "Made a new invite link",
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
