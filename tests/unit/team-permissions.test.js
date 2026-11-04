import { describe, expect, it } from "vitest";
import { canEditMember, canEditRoles, canOpenMember, canSeeAccessTab } from "@/features/team/permissions";

const member = (over) => ({ id: "x", reportsToId: null, ...over });

describe("team permissions", () => {
  it("owners and admins edit anyone", () => {
    for (const role of ["OWNER", "ADMIN"]) expect(canEditMember({ membershipId: "v", role }, member())).toBe(true);
  });
  it("managers edit only their own reports", () => {
    const v = { membershipId: "mgr", role: "MANAGER" };
    expect(canEditMember(v, member({ reportsToId: "mgr" }))).toBe(true);
    expect(canEditMember(v, member({ reportsToId: "other" }))).toBe(false);
  });
  it("accountants and members cannot edit, and open only themselves", () => {
    for (const role of ["ACCOUNTANT", "MEMBER"]) {
      const v = { membershipId: "me", role };
      expect(canEditMember(v, member())).toBe(false);
      expect(canOpenMember(v, member({ id: "me" }))).toBe(true);
      expect(canOpenMember(v, member({ id: "someone" }))).toBe(false);
    }
  });
  it("only owners and admins change roles; only staff leaders see the access tab", () => {
    expect(canEditRoles({ role: "MANAGER" })).toBe(false);
    expect(canEditRoles({ role: "ADMIN" })).toBe(true);
    expect(canSeeAccessTab({ role: "MEMBER" })).toBe(false);
    expect(canSeeAccessTab({ role: "MANAGER" })).toBe(true);
  });
});
