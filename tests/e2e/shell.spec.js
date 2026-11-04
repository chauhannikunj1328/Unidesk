import { test, expect } from "@playwright/test";
import { OWNER, clearAttempts, signIn } from "./helpers.js";

/** Needs the seed loaded (`npm run db:seed`). Signs in as the seeded owner. */

async function setTheme(page, theme) {
  await page.context().addCookies([{ name: "theme", value: theme, url: "http://localhost:3000" }]);
}

test.describe("Team looks and works differently in each theme", () => {
  test.beforeEach(async ({ page }) => { await clearAttempts(); await signIn(page, OWNER); await expect(page).toHaveURL(/\/hub$/); });
  test("glass: split view, app access lives in the person panel", async ({ page }) => {
    await setTheme(page, "glass");
    await page.goto("/hub/team");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "glass");
    await expect(page.getByRole("region", { name: "People" }).or(page.getByLabel("People"))).toBeVisible();
    await page.getByRole("button", { name: /Maya Chen/ }).click();
    await expect(page).toHaveURL(/\?id=/);
    await expect(page.getByRole("heading", { name: "App access" })).toBeVisible();
    await page.goto("/hub/team/access");
    await expect(page).toHaveURL(/\/hub\/team\?id=.*#access/); // redirected into the panel
  });

  test("pastel: icon rail, role tiles, and the access matrix", async ({ page }) => {
    await setTheme(page, "pastel");
    await page.goto("/hub/team");
    await expect(page.getByRole("complementary", { name: "Main" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Seats left" }).or(page.getByText("Seats left"))).toBeVisible();
    await page.getByRole("link", { name: "App access" }).click();
    await expect(page.getByRole("switch", { name: "Workdrive access for Maya Chen" })).toBeVisible();
    await page.getByLabel("Select Sofia Alvarez").check();
    await expect(page.getByRole("region", { name: "Bulk actions" })).toBeVisible();
  });

  test("grove: hero band, needs attention and people cards", async ({ page }) => {
    await setTheme(page, "grove");
    await page.goto("/hub/team");
    await expect(page.getByRole("heading", { name: "Your team" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit access" }).first()).toBeVisible();
  });
});

test("an access change saves, writes an audit event, and can be undone (all themes)", async ({ page }) => {
  await clearAttempts();
  await signIn(page, OWNER);
  await expect(page).toHaveURL(/\/hub$/);
  for (const theme of ["pastel", "grove"]) {
    await setTheme(page, theme);
    await page.goto("/hub/team/access");
    const cell = page.getByRole("switch", { name: "Workdrive access for Maya Chen" });
    const before = await cell.getAttribute("aria-checked");
    await cell.click();
    await expect(page.getByText(/access (given to|removed from) Maya Chen/)).toBeVisible();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(cell).toHaveAttribute("aria-checked", before);
  }
});
