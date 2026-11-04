import { APP_CODES } from "@/lib/apps";

export const ROLES = ["OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "MEMBER", "CLIENT"];

export const ROLE_HELP = {
  OWNER: "The owner has every app and manages billing. There is only one owner.",
  ADMIN: "Admins manage people, clients and settings in every app they can open. Only the owner can change billing.",
  MANAGER: "Managers see everyone and manage the people who report to them.",
  ACCOUNTANT: "Accountants work on clients, projects and money in the apps they can open.",
  MEMBER: "Members do their work in the apps they can open and see clients read-only.",
  CLIENT: "Clients sign in to the client portal and see only their own records.",
};

/** Roles whose removal of powers needs a confirmation. Higher index = fewer powers. */
export const POWER_RANK = { OWNER: 0, ADMIN: 1, MANAGER: 2, ACCOUNTANT: 3, MEMBER: 4, CLIENT: 5 };

/** Who can change what (04, 06, 07). */
export const CAN_EDIT_ANYONE = ["OWNER", "ADMIN"];

export const ALL_APPS = APP_CODES;
