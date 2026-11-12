import { test, expect } from "@playwright/test";
import { OWNER, THEMES, cleanup, clearAttempts, prisma, setTheme, signIn, testEmail } from "./helpers.js";

test.afterEach(cleanup);
test.afterAll(async () => { await cleanup(); await prisma.$disconnect(); });
test.beforeEach(clearAttempts);

for (const theme of THEMES) {
  test(`the Invites tab: count, resend limit, revoke and a dead link (${theme})`, async ({ page, browser }) => {
    test.setTimeout(90_000);
    const email = testEmail(`tab-${theme}`);
    await setTheme(page, theme);
    await signIn(page, OWNER);
    await expect(page).toHaveURL(/\/hub$/);

    // Lena (seeded) is already waiting. Invite one more and let the email go out.
    await page.goto("/hub/team?invite=1");
    const drawer = page.getByRole("dialog", { name: "Invite people" });
    await drawer.getByLabel("Email addresses").fill(email);
    await drawer.getByLabel("Email addresses").press("Enter");
    await drawer.getByRole("button", { name: "Send invite" }).click();
    await expect(page.getByText("1 invite sent")).toBeVisible();
    await expect.poll(() => prisma.emailLog.findFirst({ where: { to: email, template: "team-invite" } }).then((r) => r?.link ?? null), { timeout: 30_000 }).not.toBeNull();
    const link = (await prisma.emailLog.findFirst({ where: { to: email, template: "team-invite" } })).link;

    await page.goto("/hub/team/invites");
    await expect(page.getByText("Pending invites").first()).toBeVisible();
    await expect(page.getByText("Lena Fischer").first()).toBeVisible();
    // The tab count is the pending count on the page.
    const expected = await prisma.invite.count({ where: { status: "PENDING", expiresAt: { gt: new Date() }, organization: { name: "Unidesk Demo" } } });
    await expect(page.getByRole("link", { name: /^Invites\s*\d+/ })).toContainText(String(expected));

    // Just sent: Resend is held for an hour and says why.
    const resend = page.getByRole("button", { name: `Resend to ${email}` });
    await expect(resend).toBeDisabled();
    await expect(resend.locator("xpath=..")).toHaveAttribute("title", /You can resend in \d+ minutes?\./);

    // Revoke asks first, then the person is gone and the old link is dead.
    await page.getByRole("button", { name: `More actions for ${email}` }).click();
    await page.getByRole("menuitem", { name: "Revoke invite" }).click();
    await expect(page.getByRole("dialog", { name: `Revoke the invite to ${email}?` })).toBeVisible();
    await page.getByRole("button", { name: "Revoke", exact: true }).click();
    await expect(page.getByText(`Invite to ${email} revoked`)).toBeVisible();
    await expect(page.getByRole("button", { name: `Resend to ${email}` })).toHaveCount(0); // the row is gone

    const invitee = await (await browser.newContext()).newPage();
    await invitee.goto(link);
    await expect(invitee.getByText("This invite is no longer valid")).toBeVisible();
    await expect(invitee.locator('input[name="password"]')).toHaveCount(0);
  });
}

test("Resend on a waiting invite sends a reminder; a Member has no Invites tab", async ({ page }) => {
  await signIn(page, OWNER);
  await expect(page).toHaveURL(/\/hub$/);
  await page.goto("/hub/team/invites");
  const lena = page.getByRole("button", { name: "Resend to lena@unideskdemo.example" });
  await expect(lena).toBeEnabled(); // sent 2 days ago
  await lena.click();
  await expect(page.getByText("Invite sent again to lena@unideskdemo.example")).toBeVisible();
  const mail = await prisma.emailLog.findFirst({ where: { to: "lena@unideskdemo.example", template: "team-invite" }, orderBy: { createdAt: "desc" } });
  expect(mail.subject).toMatch(/^Reminder: .* invited you to Unidesk Demo$/);
  await prisma.emailLog.deleteMany({ where: { to: "lena@unideskdemo.example" } });

  // A Member never sees the tab and cannot open the page.
  const email = testEmail("plain");
  const owner = await prisma.user.findUnique({ where: { email: OWNER.email }, include: { memberships: true } });
  const user = await prisma.user.create({ data: { email, name: "Plain Member", passwordHash: owner.passwordHash, emailVerifiedAt: new Date() } });
  await prisma.membership.create({ data: { userId: user.id, organizationId: owner.memberships[0].organizationId, role: "MEMBER", status: "ACTIVE" } });
  await page.context().clearCookies();
  await signIn(page, { email, password: OWNER.password });
  await expect(page).toHaveURL(/\/hub$/);
  await page.goto("/hub/team");
  await expect(page.getByRole("link", { name: /^Invites/ })).toHaveCount(0);
  await page.goto("/hub/team/invites");
  await expect(page.getByText(/could not be found/i)).toBeVisible(); // not found, and no invite list is rendered
  await expect(page.getByText("Pending invites")).toHaveCount(0);
});
