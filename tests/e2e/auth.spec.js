import { test, expect } from "@playwright/test";
import { CLIENT, OWNER, STRONG, THEMES, cleanup, clearAttempts, emailLink, prisma, setTheme, signIn, testEmail } from "./helpers.js";

/** Hub flow 01 acceptance criteria (01-sign-in-and-sign-up.md). Every one runs in glass, pastel and grove. */

test.beforeAll(clearAttempts);
test.afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

for (const theme of THEMES) {
  test.describe(`flow 01 in ${theme}`, () => {
    test.beforeEach(async ({ page }) => { await clearAttempts(); await setTheme(page, theme); });

    test("signing in once opens the Hub and every app with no second sign-in", async ({ page }) => {
      await signIn(page, OWNER);
      await expect(page).toHaveURL(/\/hub$/);
      await page.goto("/crm");
      await expect(page.getByRole("heading", { name: "CRM", exact: true })).toBeVisible();
      await page.goto("/invoicing");
      await expect(page.getByRole("heading", { name: "Invoicing", exact: true })).toBeVisible();
    });

    test("a signed-out visit returns to the page after sign-in; an outside next is ignored", async ({ page }) => {
      await page.goto("/proposals");
      await expect(page).toHaveURL(/\/hub\/sign-in\?next=%2Fproposals/);
      await page.getByLabel("Work email").fill(OWNER.email);
      await page.locator('input[name="password"]').fill(OWNER.password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page).toHaveURL(/\/proposals$/);
      await page.context().clearCookies();
      await setTheme(page, theme);
      await signIn(page, OWNER, "https://evil.example/steal");
      await expect(page).toHaveURL(/\/hub$/);
    });

    test("wrong credentials give one message, never saying which was wrong", async ({ page }) => {
      await signIn(page, { email: OWNER.email, password: "wrong-password-1" });
      await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
      await expect(page.getByLabel("Work email")).toHaveValue(OWNER.email); // email stays
      await expect(page.locator('input[name="password"]')).toHaveValue(""); // password clears
      await expect(page.locator('input[name="password"]')).toBeFocused();
      await signIn(page, { email: testEmail("ghost"), password: "wrong-password-1" });
      await expect(page.getByText("Email or password is incorrect.")).toBeVisible(); // same words for an unknown email
    });

    test("five failed attempts lock the email for 15 minutes", async ({ page }) => {
      const email = testEmail("locked");
      for (let i = 0; i < 5; i++) await signIn(page, { email, password: "wrong-password-1" });
      await expect(page.getByText(/Too many attempts\. Try again in 15 minutes/)).toBeVisible();
      await expect(page.getByRole("link", { name: "Reset password" })).toBeVisible();
      await signIn(page, { email: OWNER.email, password: OWNER.password }); // other emails still work
      await expect(page).toHaveURL(/\/hub$/);
    });

    test("no error appears before a field is left or the form is sent", async ({ page }) => {
      await page.goto("/hub/sign-up");
      await page.locator('input[name="password"]').fill("short");
      await expect(page.getByText("Use at least 10 characters.")).toHaveCount(0);
      await page.getByLabel("Your name").click(); // leaves the password field
      await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
      await expect(page.getByText("Tick this box to continue.")).toHaveCount(0);
    });

    test("sign up: existing email says sign in instead; a new email reaches the inbox page; the link opens onboarding", async ({ page }) => {
      await page.goto("/hub/sign-up?ref=paulsmith");
      await expect(page.getByLabel("Referral code")).toHaveValue("PAULSMITH");
      await page.getByLabel("Your name").fill("Existing Person");
      await page.getByLabel("Work email").fill(OWNER.email);
      await page.locator('input[name="password"]').fill(STRONG);
      await page.getByLabel(/I agree to the/).check();
      await page.getByRole("button", { name: "Create account" }).click();
      await expect(page.getByText("An account with this email exists. Sign in instead.")).toBeVisible();

      const email = testEmail(`new-${theme}`);
      await page.getByLabel("Work email").fill(email);
      await page.getByRole("button", { name: "Create account" }).click();
      await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
      await expect(page.getByRole("button", { name: /Send again in \d+s/ })).toBeDisabled();

      const link = await emailLink(email, "verify-email");
      // A mail scanner opening the link must not use it up.
      expect((await page.request.get(link)).ok()).toBe(true);
      expect((await page.request.get(link)).ok()).toBe(true);
      await page.goto(link);
      await expect(page.getByRole("heading", { name: "Confirm your email" })).toBeVisible();
      await expect(page).toHaveURL(/\/hub\/verify-email\/confirm/); // still on the page: nothing has been used yet
      await page.getByRole("button", { name: "Confirm my email" }).click();
      await expect(page).toHaveURL(/\/hub\/onboarding\?step=1/);
      await page.goto("/hub"); // no organization yet: the Hub sends them back to onboarding
      await expect(page).toHaveURL(/\/hub\/onboarding/);
      await page.goto(link); // link already used
      await expect(page.getByRole("heading", { name: "This link no longer works" })).toBeVisible();
    });

    test("an expired confirmation link offers a new one", async ({ page }) => {
      const email = testEmail(`late-${theme}`);
      await page.goto("/hub/sign-up");
      await page.getByLabel("Your name").fill("Late Person");
      await page.getByLabel("Work email").fill(email);
      await page.locator('input[name="password"]').fill(STRONG);
      await page.getByLabel(/I agree to the/).check();
      await page.getByRole("button", { name: "Create account" }).click();
      const link = await emailLink(email, "verify-email");
      await prisma.emailToken.updateMany({ where: { user: { email } }, data: { expiresAt: new Date(Date.now() - 1000) } });
      await page.goto(link);
      await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
      await expect(page.getByRole("button", { name: /Send a new link|Send again in/ })).toBeVisible();
    });

    test("forgot password gives the same message for any email", async ({ page }) => {
      for (const email of [OWNER.email, testEmail("nobody")]) {
        await page.goto("/hub/forgot-password");
        await page.getByLabel("Work email").fill(email);
        await page.getByRole("button", { name: "Send reset link" }).click();
        await expect(page.getByText("If an account exists for that email, we sent a reset link. It works for 1 hour.")).toBeVisible();
      }
    });

    test("reset password works once, then the link is dead", async ({ page }) => {
      const email = testEmail(`reset-${theme}`);
      const hash = (await prisma.user.findUnique({ where: { email: OWNER.email } })).passwordHash;
      await prisma.user.create({ data: { email, name: "Reset Person", passwordHash: hash, emailVerifiedAt: new Date() } });
      await page.goto("/hub/forgot-password");
      await page.getByLabel("Work email").fill(email);
      await page.getByRole("button", { name: "Send reset link" }).click();
      const link = await emailLink(email, "reset-password");
      await page.goto(link);
      await page.getByLabel(/^New password/).fill(STRONG);
      await page.getByLabel("Confirm new password").fill(STRONG);
      await page.getByRole("button", { name: "Save password" }).click();
      await expect(page).toHaveURL(/\/hub\/sign-in\?reset=1/);
      await expect(page.getByText("Password saved. Sign in with your new password.")).toBeVisible();
      await page.goto(link);
      await expect(page.getByRole("heading", { name: "This reset link no longer works" })).toBeVisible();
    });

    test("a removed member cannot sign in and is told why", async ({ page }) => {
      const email = testEmail(`removed-${theme}`);
      const owner = await prisma.user.findUnique({ where: { email: OWNER.email }, include: { memberships: true } });
      const hash = owner.passwordHash;
      const user = await prisma.user.create({ data: { email, name: "Removed Person", passwordHash: hash, emailVerifiedAt: new Date() } });
      await prisma.membership.create({ data: { userId: user.id, organizationId: owner.memberships[0].organizationId, role: "MEMBER", status: "INACTIVE" } });
      await signIn(page, { email, password: OWNER.password });
      await expect(page.getByText("Your access to Unidesk Demo was removed. Ask the owner to invite you again.")).toBeVisible();
      await page.goto("/hub");
      await expect(page).toHaveURL(/\/hub\/sign-in/);
    });

    test("a client lands on the portal and never sees the Hub", async ({ page }) => {
      await signIn(page, CLIENT);
      await expect(page).toHaveURL(/\/portal$/);
      await page.goto("/hub/team");
      await expect(page).toHaveURL(/\/portal$/);
    });

    test("works with the keyboard only and announces errors", async ({ page }) => {
      await page.goto("/hub/sign-in");
      await page.getByLabel("Work email").focus();
      await page.keyboard.type(OWNER.email);
      await page.keyboard.press("Tab");
      await page.keyboard.type("wrong-password-1");
      await page.keyboard.press("Enter");
      await expect(page.getByRole("status").filter({ hasText: "Email or password is incorrect." })).toBeVisible();
      await page.getByLabel("Work email").fill("not-an-email");
      await page.locator('input[name="password"]').focus();
      await expect(page.getByLabel("Work email")).toHaveAttribute("aria-invalid", "true");
    });

    test("signing out ends the session", async ({ page }) => {
      await signIn(page, OWNER);
      await page.getByRole("button", { name: /Account menu for/ }).click();
      await page.getByRole("menuitem", { name: "Sign out" }).click();
      await expect(page).toHaveURL(/\/hub\/sign-in\?signedout=1/);
      await expect(page.getByText("You're signed out")).toBeVisible();
      await page.goto("/hub/team");
      await expect(page).toHaveURL(/\/hub\/sign-in/);
    });
  });
}
