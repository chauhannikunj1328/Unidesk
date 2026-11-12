import { describe, expect, it } from "vitest";
import { CAPABILITIES, ROLE_ORDER, roleHeadcount } from "@/features/team/roles-rules";
import { canEditRoles, canSeeAccessTab, canSeeInvitesTab, canSeeSharedDataTab } from "@/features/team/permissions";
import { invitableRoles } from "@/features/team/invite-rules";

const cap = (id) => CAPABILITIES.find((c) => c.id === id).values;
const viewer = (role) => ({ role, membershipId: "m" });
const yes = (v) => v !== false;

/** The Roles page is read by people deciding who to trust. It must never say something the app does not enforce. */
describe("the Roles page matches what the app enforces", () => {
  it("lists all six roles, and every capability has an answer for each", () => {
    expect(ROLE_ORDER).toEqual(["OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "MEMBER", "CLIENT"]);
    for (const c of CAPABILITIES) for (const r of ROLE_ORDER) expect(c.values, `${c.id}/${r}`).toHaveProperty(r);
  });
  it("invite", () => { for (const r of ROLE_ORDER) expect(yes(cap("invite")[r]), r).toBe(invitableRoles(r).length > 0); });
  it("change roles", () => { for (const r of ROLE_ORDER) expect(cap("roles")[r] === true, r).toBe(canEditRoles(viewer(r))); });
  it("shared data", () => { for (const r of ROLE_ORDER) expect(cap("shared")[r] === true, r).toBe(canSeeSharedDataTab(viewer(r))); });
  it("app access (managers only for their reports)", () => { for (const r of ROLE_ORDER) expect(yes(cap("access")[r]), r).toBe(canSeeAccessTab(viewer(r))); });
  it("invites", () => { for (const r of ROLE_ORDER) expect(yes(cap("invites")[r]), r).toBe(canSeeInvitesTab(viewer(r))); });
  it("the owner is the only one who changes billing", () => {
    expect(ROLE_ORDER.filter((r) => cap("billing")[r] === true)).toEqual(["OWNER"]);
  });
});

describe("headcount", () => {
  it("counts everyone who is not deactivated, per role", () => {
    const c = roleHeadcount([{ role: "ADMIN", status: "active" }, { role: "ADMIN", status: "invited" }, { role: "ADMIN", status: "inactive" }, { role: "CLIENT", status: "active" }]);
    expect(c).toMatchObject({ OWNER: 0, ADMIN: 2, CLIENT: 1 });
  });
});
