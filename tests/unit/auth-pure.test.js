import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";
import { landingFor } from "@/lib/landing";
import { fieldErrors, forgotSchema, passwordProblem, resetSchema, signInSchema, signUpSchema } from "@/lib/validators/auth";

describe("safeNext", () => {
  it("allows same-site paths", () => {
    expect(safeNext("/proposals")).toBe("/proposals");
    expect(safeNext("/hub/team?id=abc#access")).toBe("/hub/team?id=abc#access");
  });
  it("ignores anything that leaves the site", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "evil.com", "", null, undefined, 42, "/ok\nSet-Cookie: x=1"]) {
      expect(safeNext(bad), String(bad)).toBe("/hub");
    }
  });
  it("never returns to the sign-in pages", () => {
    expect(safeNext("/hub/sign-in?next=/hub")).toBe("/hub");
    expect(safeNext("/hub/reset-password/abc")).toBe("/hub");
  });
});

describe("landingFor", () => {
  it("sends people with no organization to onboarding", () => {
    expect(landingFor({ orgId: null }, "/proposals")).toBe("/hub/onboarding?step=1");
  });
  it("keeps clients out of the Hub", () => {
    expect(landingFor({ orgId: "o", role: "CLIENT" }, "/hub/team")).toBe("/portal");
  });
  it("honours a safe next for staff, else the Hub", () => {
    expect(landingFor({ orgId: "o", role: "OWNER" }, "/proposals")).toBe("/proposals");
    expect(landingFor({ orgId: "o", role: "OWNER" }, "https://evil.com")).toBe("/hub");
    expect(landingFor({ orgId: "o", role: "OWNER" }, undefined)).toBe("/hub");
  });
});

describe("password rules", () => {
  it("needs 10 to 128 characters", () => {
    expect(passwordProblem("short")).toMatch(/at least 10/);
    expect(passwordProblem("x".repeat(129))).toMatch(/at most 128/);
    expect(passwordProblem("a-Good-passphrase-7")).toBeNull();
  });
  it("rejects common and trivial passwords", () => {
    for (const bad of ["password123", "PASSWORD123", "1234567890", "aaaaaaaaaaaa", "qwertyuiop"]) expect(passwordProblem(bad), bad).toMatch(/too common/);
  });
});

describe("form schemas", () => {
  it("trims and lower-cases the email", () => {
    expect(signInSchema.parse({ email: "  Paul@Example.COM ", password: "x" }).email).toBe("paul@example.com");
  });
  it("sign-up asks for the terms box and says so in plain words", () => {
    const r = signUpSchema.safeParse({ name: "A", email: "a@b.co", password: "a-Good-passphrase-7", terms: false });
    expect(fieldErrors(r.error).terms).toBe("Tick this box to continue.");
  });
  it("sign-up reports a weak password on the password field", () => {
    const r = signUpSchema.safeParse({ name: "A", email: "a@b.co", password: "short", terms: true });
    expect(fieldErrors(r.error).password).toMatch(/at least 10/);
  });
  it("accepts a clean referral code and rejects junk", () => {
    expect(signUpSchema.parse({ name: "A", email: "a@b.co", password: "a-Good-passphrase-7", terms: true, referralCode: "paulsmith" }).referralCode).toBe("PAULSMITH");
    expect(signUpSchema.safeParse({ name: "A", email: "a@b.co", password: "a-Good-passphrase-7", terms: true, referralCode: "no spaces!" }).success).toBe(false);
  });
  it("reset needs matching passwords", () => {
    const r = resetSchema.safeParse({ password: "a-Good-passphrase-7", confirm: "different-passphrase-8" });
    expect(fieldErrors(r.error).confirm).toBe("The passwords don't match.");
  });
  it("forgot needs a valid email", () => {
    expect(forgotSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});
