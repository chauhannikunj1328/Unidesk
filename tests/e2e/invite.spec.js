import { test, expect } from "@playwright/test";
import { OWNER, THEMES, STRONG, cleanup, clearAttempts, prisma, setTheme, signIn, testEmail } from "./helpers.js";

test.afterEach(cleanup);
test.afterAll(async () => { await cleanup(); await prisma.$disconnect(); });
test.beforeEach(clearAttempts);

async function sendOne(page, email) {
  await page.goto("/hub/team?invite=1");
  const drawer = page.getByRole("dialog", { name: "Invite people" });
  await expect(drawer).toBeVisible();
  const field = drawer.getByLabel("Email addresses");
  await field.fill(`${email}, not-an-address`);
  await field.press("Enter");
  await expect(drawer.getByText("not-an-address: Check this address", { exact: false })).toBeVisible();
  await expect(drawer.getByText(/1 person · Member · 1 app/)).toBeVisible();
  await drawer.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText("1 invite sent")).toBeVisible();
}

for (const theme of THEMES) {
  test(`invite someone, take it back, invite again and they join (${theme})`, async ({ page, browser }) => {
    test.setTimeout(90_000);
    const email = testEmail(`invite-${theme}`);
    await setTheme(page, theme);
    await signIn(page, OWNER);
    await expect(page).toHaveURL(/\/hub$/);

    // Send, then Undo inside the Undo time: nothing is ever emailed and nobody is left behind.
    await sendOne(page, email);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText(/Nothing was emailed/)).toBeVisible();
    if (theme === "glass") {
      await page.waitForTimeout(10_000);
      expect(await prisma.emailLog.count({ where: { to: email } })).toBe(0);
    }
    expect(await prisma.membership.count({ where: { user: { email } } })).toBe(0);

    // Send again, leave it, and the email arrives after the Undo time.
    await sendOne(page, email);
    await expect(page.getByText("Invited").first()).toBeVisible();
    await expect.poll(() => prisma.emailLog.findFirst({ where: { to: email, template: "team-invite" } }).then((r) => r?.link ?? null), { timeout: 30_000 }).not.toBeNull();
    const link = (await prisma.emailLog.findFirst({ where: { to: email, template: "team-invite" } })).link;

    // The invited person opens the link, chooses a password and lands in the Hub.
    const ctx = await browser.newContext();
    const invitee = await ctx.newPage();
    await setTheme(invitee, theme);
    await invitee.goto(link);
    await expect(invitee.getByText(/invited you to join as a Member/)).toBeVisible();
    await invitee.locator('input[name="password"]').fill(STRONG);
    await invitee.getByLabel(/I agree to the/).check();
    await invitee.getByRole("button", { name: /^Join / }).click();
    await expect(invitee).toHaveURL(/\/hub$/);
    await invitee.goto(link);
    await expect(invitee.getByText(/already joined/)).toBeVisible(); // the link works once
    await ctx.close();
  });
}

test("a Member cannot open the invite drawer", async ({ page }) => {
  const email = testEmail("member-only");
  const owner = await prisma.user.findUnique({ where: { email: OWNER.email }, include: { memberships: true } });
  const user = await prisma.user.create({ data: { email, name: "Plain Member", passwordHash: owner.passwordHash, emailVerifiedAt: new Date() } });
  await prisma.membership.create({ data: { userId: user.id, organizationId: owner.memberships[0].organizationId, role: "MEMBER", status: "ACTIVE" } });
  await signIn(page, { email, password: OWNER.password });
  await page.goto("/hub/team?invite=1");
  await expect(page.getByRole("dialog", { name: "Invite people" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Invite (member|people)/ })).toHaveCount(0);
});

test("an invite link that was never valid says so and shows no form", async ({ page }) => {
  await page.goto("/invite/this-is-not-a-real-invite-token-0000");
  await expect(page.getByText("This invite link isn't valid")).toBeVisible();
  await expect(page.locator('input[name="password"]')).toHaveCount(0);
});
