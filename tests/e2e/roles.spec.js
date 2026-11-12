import { test, expect } from "@playwright/test";
import { OWNER, cleanup, clearAttempts, prisma, setTheme, signIn } from "./helpers.js";

test.afterAll(async () => { await cleanup(); await prisma.$disconnect(); });
test.beforeEach(clearAttempts);

for (const theme of ["glass", "grove"]) {
  test(`Roles tab shows what each role can do, read-only (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await signIn(page, OWNER);
    await expect(page).toHaveURL(/\/hub$/);
    await page.goto("/hub/team");
    await page.getByRole("link", { name: /^Roles\s*6/ }).click();
    await expect(page).toHaveURL(/\/hub\/team\/roles$/);
    const table = page.getByRole("table", { name: "What each role can do" });
    await expect(table).toBeVisible();
    for (const role of ["Owner", "Admin", "Manager", "Accountant", "Member", "Client"]) await expect(table.getByRole("columnheader", { name: new RegExp(`^${role}`) })).toBeVisible();
    await expect(table.getByRole("row", { name: /Change billing or delete the organization/ })).toContainText("Yes");
    await expect(table.getByRole("row", { name: /Invite people/ })).toContainText("Members only");
    await expect(table.getByRole("columnheader", { name: /Admin.*You/ })).toBeVisible(); // the demo account is an Admin
    await expect(table.getByRole("switch")).toHaveCount(0); // nothing here can be changed
    await expect(page.locator("body")).not.toContainText(/OWNER|ADMIN\b|auth\./);
  });
}

test("pastel: Roles & permissions is a drawer on the People page, and /roles goes there", async ({ page }) => {
  await setTheme(page, "pastel");
  await signIn(page, OWNER);
  await expect(page).toHaveURL(/\/hub$/);
  await page.goto("/hub/team/roles");
  await expect(page).toHaveURL(/\/hub\/team\?roles=1/);
  const drawer = page.getByRole("dialog", { name: "Roles & permissions" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("table", { name: "What each role can do" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Roles/ })).toHaveCount(0); // not a tab in pastel
  await page.getByRole("button", { name: "Roles & permissions" }).click();
  await expect(drawer).toBeVisible();
});
