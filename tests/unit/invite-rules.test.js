import { describe, expect, it } from "vitest";
import { classifyEmail, defaultApps, effectiveApps, invitableRoles, nameFromEmail, seatCheck, shortSeatsMessage, splitEmails, summaryLine } from "@/features/team/invite-rules";

describe("splitEmails", () => {
  it("splits commas, new lines, spaces and semicolons", () => {
    expect(splitEmails("a@x.com, b@x.com\nc@x.com;d@x.com  e@x.com")).toEqual(["a@x.com", "b@x.com", "c@x.com", "d@x.com", "e@x.com"]);
  });
  it("reads Name <address> style", () => {
    expect(splitEmails('"Anna" <anna@x.com>')).toEqual(["Anna", "anna@x.com"]);
  });
});

describe("classifyEmail", () => {
  const existing = new Map([["old@x.com", "active"], ["gone@x.com", "inactive"]]);
  it("marks invalid, member and removed addresses with plain words", () => {
    expect(classifyEmail("nope", existing)).toMatchObject({ state: "invalid", message: "Check this address" });
    expect(classifyEmail("OLD@x.com", existing)).toMatchObject({ state: "member", message: "Already in your team" });
    expect(classifyEmail("gone@x.com", existing).state).toBe("inactive");
    expect(classifyEmail("New@X.com", existing)).toEqual({ email: "new@x.com", state: "ok" });
  });
});

describe("roles and apps", () => {
  it("never offers the owner; managers only invite members", () => {
    expect(invitableRoles("ADMIN")).not.toContain("OWNER");
    expect(invitableRoles("MANAGER")).toEqual(["MEMBER"]);
    expect(invitableRoles("MEMBER")).toEqual([]);
  });
  it("role defaults match the spec", () => {
    expect(defaultApps("MEMBER")).toEqual(["CRM"]);
    expect(defaultApps("MANAGER")).toEqual(["CRM", "WORKDRIVE", "SOP"]);
    expect(defaultApps("ACCOUNTANT")).toEqual(["INVOICING", "ACCOUNTING"]);
    expect(defaultApps("CLIENT")).toEqual(["WORKDRIVE", "PROPOSALS"]);
    expect(defaultApps("ADMIN")).toHaveLength(7);
  });
  it("admins get every app and clients only portal apps", () => {
    expect(effectiveApps("ADMIN", [])).toHaveLength(7);
    expect(effectiveApps("CLIENT", ["CRM", "WORKDRIVE"])).toEqual(["WORKDRIVE"]);
    expect(effectiveApps("MEMBER", ["SOP", "CRM"])).toEqual(["CRM", "SOP"]);
  });
});

describe("seats", () => {
  const appUsage = { CRM: 9, SOP: 5, WORKDRIVE: 0, PROPOSALS: 0, APPOINTMENT: 0, INVOICING: 0, ACCOUNTING: 0 };
  it("is fine when every chosen app has room", () => {
    expect(seatCheck({ people: 1, role: "MEMBER", apps: ["CRM"], appUsage, seatLimit: 10 }).ok).toBe(true);
  });
  it("names the app that is short, how many are missing and the price", () => {
    const r = seatCheck({ people: 3, role: "MEMBER", apps: ["CRM", "SOP"], appUsage, seatLimit: 10 });
    expect(r.ok).toBe(false);
    expect(r.short).toEqual([{ app: "CRM", missing: 2, price: 599 }]);
    expect(shortSeatsMessage(r.short)).toBe("You need 2 more CRM seats. CRM costs $5.99 per person per month.");
  });
  it("clients never use seats", () => {
    expect(seatCheck({ people: 50, role: "CLIENT", apps: ["WORKDRIVE"], appUsage: { WORKDRIVE: 10 }, seatLimit: 10 }).ok).toBe(true);
    expect(summaryLine({ people: 2, role: "CLIENT", apps: ["WORKDRIVE"], appUsage, seatLimit: 10 })).toContain("Client logins are free");
  });
  it("the summary uses the app with the fewest seats left", () => {
    expect(summaryLine({ people: 1, role: "MEMBER", apps: ["CRM", "SOP"], appUsage, seatLimit: 10 })).toBe("1 person · Member · 2 apps. Uses 1 of your 1 seat left. Invites expire after 7 days.");
  });
});

describe("summary when seats are short", () => {
  it("says what is needed instead of a confusing 'uses 3 of 2'", () => {
    expect(summaryLine({ people: 3, role: "MEMBER", apps: ["CRM"], appUsage: { CRM: 8 }, seatLimit: 10 })).toBe("3 people · Member · 1 app. Needs 3 CRM seats and 2 are left.");
  });
});

describe("nameFromEmail", () => {
  it("makes a readable starting name", () => {
    expect(nameFromEmail("anna.ruiz@example.com")).toBe("Anna Ruiz");
    expect(nameFromEmail("1234@example.com")).toBe("New member");
  });
});
