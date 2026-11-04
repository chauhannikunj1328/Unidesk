import { test, expect } from "@playwright/test";
import { OWNER, clearAttempts, cleanup, prisma, setTheme, signIn, testEmail } from "./helpers.js";

test.afterAll(async () => { await cleanup(); await prisma.$disconnect(); });
test.beforeEach(clearAttempts);

test("the resend countdown is the same for a real and an unknown email", async ({ browser }) => {
  const seen = [];
  for (const email of [OWNER.email, testEmail("nobody-resend")]) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("http://localhost:3000/hub/verify-email?status=expired");
    await page.getByLabel("Work email").fill(email);
    await page.getByRole("button", { name: "Send a new link" }).click();
    await expect(page.getByRole("button", { name: /Send again in \d+s/ })).toBeVisible();
    seen.push(await page.getByRole("button", { name: /Send again in/ }).innerText());
    await expect(page.getByText("We sent a new link. Check your inbox.")).toBeVisible();
    await ctx.close();
  }
  const secs = seen.map((s) => Number(s.match(/\d+/)[0]));
  expect(Math.abs(secs[0] - secs[1])).toBeLessThanOrEqual(2); // both start from 60
  expect(secs[0]).toBeGreaterThan(55);
});

test("pages redirect, not crash, when the cookie is still present but the session is dead", async ({ page }) => {
  const owner = await prisma.user.findUnique({ where: { email: OWNER.email }, include: { memberships: true } });
  const email = testEmail("stale");
  const user = await prisma.user.create({ data: { email, name: "Stale Person", passwordHash: owner.passwordHash, emailVerifiedAt: new Date() } });
  await prisma.membership.create({ data: { userId: user.id, organizationId: owner.memberships[0].organizationId, role: "ADMIN", status: "ACTIVE" } });
  await signIn(page, { email, password: OWNER.password });
  await expect(page).toHaveURL(/\/hub$/);
  await page.waitForTimeout(1300);
  await prisma.user.update({ where: { id: user.id }, data: { sessionsValidAfter: new Date() } });
  // The cookie is untouched (no call to the session endpoint), so the middleware lets these through to the pages.
  for (const path of ["/hub", "/hub/team", "/hub/team/access", "/crm"]) {
    const response = await page.goto(path);
    await expect(page).toHaveURL(/\/hub\/sign-in/);
    expect(response.status(), path).toBeLessThan(500);
  }
});

test("pastel: typing in the search box while the URL catches up keeps every letter", async ({ page }) => {
  await setTheme(page, "pastel");
  await signIn(page, OWNER);
  await expect(page).toHaveURL(/\/hub$/);
  await page.goto("/hub/team");
  // A slow page update: the URL echo of "so" arrives about 700 ms after it was sent.
  await page.route(/_rsc=/, async (route) => { await new Promise((r) => setTimeout(r, 700)); await route.continue(); });
  const box = page.getByPlaceholder("Search by name or email");
  await box.click();
  await box.pressSequentially("so");
  await page.waitForTimeout(350); // "so" is now on its way to the URL
  await box.pressSequentially("f"); // typed before the echo of "so" comes back
  await page.waitForTimeout(750); // the echo of "so" has now arrived
  await box.pressSequentially("ia");
  await page.waitForTimeout(2000);
  await expect(box).toHaveValue("sofia"); // before the fix the echo reset the box to "so", so this ended as "soia"
  await expect(page).toHaveURL(/[?&]q=sofia/);
});

test("pastel: keyboard focus stays on a switch after the page refreshes behind the drawer", async ({ page }) => {
  await setTheme(page, "pastel");
  await signIn(page, OWNER);
  await expect(page).toHaveURL(/\/hub$/);
  await page.goto("/hub/team");
  await page.getByRole("row", { name: /^Maya Chen/ }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  const sw = drawer.getByRole("switch", { name: "Workdrive access for Maya Chen" });
  await sw.click(); // saves, then the page behind the drawer re-renders
  await expect(page.getByText(/access (given to|removed from) Maya Chen/)).toBeVisible();
  await page.waitForTimeout(1200);
  await expect(sw).toBeFocused(); // before the fix, focus jumped to the first control (Close)
  await sw.click(); // put it back
});
