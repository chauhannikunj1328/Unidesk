import { describe, expect, it } from "vitest";
import { AccessError, requireAccess } from "@/server/access";

const owner = { userId: "u1", orgId: "o1", role: "OWNER", apps: [] };
const member = { userId: "u2", orgId: "o1", role: "MEMBER", apps: ["CRM"] };
const client = { userId: "u3", orgId: "o1", role: "CLIENT", apps: ["WORKDRIVE"] };

describe("requireAccess", () => {
  it("rejects a missing session", () => {
    expect(() => requireAccess(null)).toThrow(AccessError);
  });
  it("owners always have every app", () => {
    expect(requireAccess(owner, { app: "ACCOUNTING" })).toBe(owner);
  });
  it("members need app access", () => {
    expect(requireAccess(member, { app: "CRM" })).toBe(member);
    expect(() => requireAccess(member, { app: "INVOICING" })).toThrow(AccessError);
  });
  it("checks the role list", () => {
    expect(() => requireAccess(member, { roles: ["OWNER", "ADMIN"] })).toThrow(AccessError);
    expect(requireAccess(owner, { roles: ["OWNER", "ADMIN"] })).toBe(owner);
  });
  it("clients are kept out of staff areas", () => {
    expect(() => requireAccess(client, { app: "WORKDRIVE" })).toThrow(AccessError);
    expect(requireAccess(client, { roles: ["CLIENT"], app: "WORKDRIVE" })).toBe(client);
  });
});
