import { describe, expect, it } from "vitest";
import { actionLabel, appLabel, roleLabel } from "@/lib/labels";

describe("labels", () => {
  it("maps codes to plain words", () => {
    expect(actionLabel("client.created")).toBe("Added a client");
    expect(roleLabel("ACCOUNTANT")).toBe("Accountant");
    expect(appLabel("CRM")).toBe("CRM");
  });
  it("never leaks an unknown code to the UI", () => {
    expect(actionLabel("some.unmapped_code")).not.toContain(".");
    expect(roleLabel("NOPE")).toBe("Unknown role");
  });
});
