import { test, expect } from "@playwright/test";
import { OWNER, THEMES, cleanup, clearAttempts, prisma, setTheme, signIn, testEmail } from "./helpers.js";

test.afterEach(cleanup);
test.afterAll(async () => { await cleanup(); await prisma.$disconnect(); });
test.beforeEach(clearAttempts);

const orgId = async () => (await prisma.organization.findFirst({ where: { name: "Unidesk Demo" } })).id;
const saved = async (app) => prisma.sharedDataSetting.findFirst({ where: { organizationId: await orgId(), app } });

for (const theme of THEMES) {
  test(`shared data: switch, undo, confirmation and Projects need Clients (${theme})`, async ({ page }) => {
    await prisma.sharedDataSetting.deleteMany({ where: { organizationId: await orgId() } });
    await setTheme(page, theme);
    await signIn(page, OWNER);
    await expect(page).toHaveURL(/\/hub$/);
    await page.goto("/hub/team/shared-data");
    await expect(page.getByRole("link", { name: "Shared data" })).toBeVisible();

    // Turning Contacts on for Appointment's neighbour Workdrive saves at once, and Undo puts it back.
    const wdContacts = page.getByRole("switch", { name: "Workdrive can read contacts" });
    await expect(wdContacts).toHaveAttribute("aria-checked", "false");
    await wdContacts.click();
    await expect(page.getByText("Workdrive can now read contacts.")).toBeVisible();
    await expect(wdContacts).toHaveAttribute("aria-checked", "true");
    await expect.poll(async () => (await saved("WORKDRIVE"))?.contacts).toBe(true);
    expect((await prisma.auditEvent.findFirst({ where: { action: "team.shared_data_on" }, orderBy: { createdAt: "desc" } })).summary).toMatch(/let Workdrive read contacts$/);
    await page.getByRole("button", { name: "Undo" }).first().click();
    await expect(wdContacts).toHaveAttribute("aria-checked", "false");
    await expect.poll(async () => (await saved("WORKDRIVE"))?.contacts).toBe(false);

    // Turning off something an app needs asks first, and cancelling changes nothing.
    const sopClients = page.getByRole("switch", { name: "SOP can read clients" });
    await sopClients.click();
    const dialog = page.getByRole("dialog", { name: "Stop SOP reading clients?" });
    await expect(dialog).toContainText("SOP will no longer show client folders. Existing SOPs keep their client label.");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(sopClients).toHaveAttribute("aria-checked", "true");

    // Clients off for Invoicing: confirm, Projects follow, and the row keeps its warning.
    await page.getByRole("switch", { name: "Invoicing can read clients" }).click();
    const d2 = page.getByRole("dialog", { name: "Stop Invoicing reading clients?" });
    await expect(d2).toContainText("Projects will be turned off too.");
    await d2.getByRole("button", { name: "Turn off" }).click();
    await expect(page.getByRole("switch", { name: "Invoicing can read clients" })).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("switch", { name: "Invoicing can read projects" })).toHaveAttribute("aria-checked", "false");
    await expect(page.getByText("Invoicing can't send invoices without clients.").first()).toBeVisible();
    await expect(page.getByText("Projects need Clients, so Projects were turned off too.")).toBeVisible();

    // The "2 of 3" style meter matches the switches that are on (Invoicing now has only Contacts).
    await expect(page.getByText("1 of 3").first()).toBeVisible();

    // A reload shows the saved state; nothing is mentioned in internal words.
    await page.reload();
    await expect(page.getByRole("switch", { name: "Invoicing can read clients" })).toHaveAttribute("aria-checked", "false");
    await expect(page.locator("body")).not.toContainText(/CRM areas|SSO|module session/i);
    await prisma.sharedDataSetting.deleteMany({ where: { organizationId: await orgId() } });
  });
}

test("only owners and admins have the Shared data tab", async ({ page }) => {
  const email = testEmail("mgr-shared");
  const owner = await prisma.user.findUnique({ where: { email: OWNER.email }, include: { memberships: true } });
  const user = await prisma.user.create({ data: { email, name: "Some Manager", passwordHash: owner.passwordHash, emailVerifiedAt: new Date() } });
  await prisma.membership.create({ data: { userId: user.id, organizationId: owner.memberships[0].organizationId, role: "MANAGER", status: "ACTIVE" } });
  await signIn(page, { email, password: OWNER.password });
  await expect(page).toHaveURL(/\/hub$/);
  await page.goto("/hub/team");
  await expect(page.getByRole("link", { name: "Shared data" })).toHaveCount(0);
  await page.goto("/hub/team/shared-data");
  await expect(page.getByText(/could not be found/i)).toBeVisible();
  await expect(page.getByRole("switch")).toHaveCount(0);
});
