import { test, expect } from "@playwright/test";
import { OWNER, THEMES, STRONG, cleanup, clearAttempts, prisma, setTheme, signIn, testEmail } from "./helpers.js";

test.afterEach(async () => {
  await prisma.client.deleteMany({ where: { name: { startsWith: "e2e-client-" } } });
  await cleanup();
  await prisma.organization.deleteMany({ where: { name: { startsWith: "E2E Ownership" } } });
});
test.afterAll(async () => { await prisma.$disconnect(); });
test.beforeEach(clearAttempts);

const demoOrg = async () => (await prisma.organization.findFirst({ where: { name: "Unidesk Demo" } })).id;
const hash = async () => (await prisma.user.findUnique({ where: { email: OWNER.email } })).passwordHash;
async function person(key, { role = "MEMBER", reportsToId = null, apps = ["CRM"] } = {}) {
  const user = await prisma.user.create({ data: { email: testEmail(key), name: `Pat ${key}`, passwordHash: await hash(), emailVerifiedAt: new Date() } });
  const m = await prisma.membership.create({ data: { userId: user.id, organizationId: await demoOrg(), role, status: "ACTIVE", reportsToId, joinedAt: new Date() } });
  for (const app of apps) await prisma.appAccess.create({ data: { membershipId: m.id, organizationId: m.organizationId, app } });
  return { user, m };
}
const status = async (p) => (await prisma.membership.findUnique({ where: { id: p.m.id } })).status;

for (const theme of THEMES) {
  test(`deactivate, reactivate and remove with a hand-over (${theme})`, async ({ page, browser }) => {
    test.setTimeout(90_000);
    const pat = await person(`pat-${theme}`);
    const junior = await person(`junior-${theme}`, { reportsToId: pat.m.id });
    const client = await prisma.client.create({ data: { organizationId: await demoOrg(), name: `e2e-client-${theme}`, ownerId: pat.m.id } });
    await setTheme(page, theme);
    await signIn(page, OWNER);
    await expect(page).toHaveURL(/\/hub$/);

    // Deactivate: asks first, then Pat cannot sign in.
    await page.goto(`/hub/team?id=${pat.m.id}`);
    await page.getByRole("button", { name: "Deactivate", exact: true }).click();
    const dlg = page.getByRole("dialog", { name: `Deactivate ${pat.user.name}?` });
    await expect(dlg).toContainText("Their work and files stay as they are");
    await dlg.getByRole("button", { name: "Deactivate" }).click();
    await expect(page.getByText(`${pat.user.name} was deactivated.`)).toBeVisible();
    await expect.poll(() => status(pat)).toBe("INACTIVE");
    const other = await (await browser.newContext()).newPage();
    await signIn(other, { email: pat.user.email, password: OWNER.password });
    await expect(other.getByText(/was removed|access/i).first()).toBeVisible();
    await expect(other).not.toHaveURL(/\/hub$/);

    // Reactivate: back as a Member with the same app.
    await page.goto(`/hub/team?id=${pat.m.id}`);
    await page.getByRole("button", { name: "Reactivate" }).last().click(); // the open panel or drawer is last
    await expect(page.getByText(`${pat.user.name} is active again.`)).toBeVisible();
    await expect.poll(() => status(pat)).toBe("ACTIVE");
    expect((await prisma.appAccess.findMany({ where: { membershipId: pat.m.id } })).map((a) => a.app)).toEqual(["CRM"]);

    // Remove: hand over the client and the report, then type REMOVE.
    await page.goto(`/hub/team?id=${pat.m.id}`);
    await page.getByRole("button", { name: "Remove from workspace" }).click();
    const wiz = page.getByRole("dialog", { name: `Remove ${pat.user.name}?` });
    await expect(wiz).toContainText("Hand over work");
    await expect(wiz.getByLabel(/1 client .* give to/)).toBeVisible();
    await expect(wiz.getByLabel(/New manager for 1 person/)).toBeVisible();
    await wiz.getByRole("button", { name: "Continue" }).click();
    const remove = wiz.getByRole("button", { name: "Remove from workspace" });
    await expect(remove).toBeDisabled();
    await wiz.getByLabel("Type REMOVE to confirm").fill("remove");
    await expect(remove).toBeDisabled(); // exact word only
    await wiz.getByLabel("Type REMOVE to confirm").fill("REMOVE");
    await remove.click();
    await expect(page.getByText(new RegExp(`${pat.user.name} was removed\\. 1 client moved to`))).toBeVisible();
    await expect.poll(() => status(pat)).toBe("REMOVED");
    expect((await prisma.client.findUnique({ where: { id: client.id } })).ownerId).not.toBe(pat.m.id);
    expect((await prisma.membership.findUnique({ where: { id: junior.m.id } })).reportsToId).not.toBe(pat.m.id);
    await page.goto("/hub/team");
    await expect(page.getByText(pat.user.email)).toHaveCount(0); // gone from the list (the name still appears in activity history)
    const event = await prisma.auditEvent.findFirst({ where: { action: "team.removed" }, orderBy: { createdAt: "desc" } });
    expect(event.summary).toContain(`removed ${pat.user.name} and moved 1 client`);
  });
}

test("the owner row and your own row have no deactivate or remove, and managers cannot", async ({ page }) => {
  await signIn(page, OWNER);
  await expect(page).toHaveURL(/\/hub$/);
  const owner = await prisma.membership.findFirst({ where: { organizationId: await demoOrg(), role: "OWNER" } });
  await page.goto(`/hub/team?id=${owner.id}`);
  await expect(page.getByText("The owner's role can't be changed here.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Deactivate", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remove from workspace" })).toHaveCount(0);
  const me = await prisma.membership.findFirst({ where: { organizationId: await demoOrg(), user: { email: OWNER.email } } });
  await page.goto(`/hub/team?id=${me.id}`);
  await expect(page.getByRole("button", { name: "Deactivate", exact: true })).toHaveCount(0);

  const mgr = await person("mgr-life", { role: "MANAGER" });
  const target = await person("target-life");
  await prisma.membership.update({ where: { id: target.m.id }, data: { reportsToId: mgr.m.id } });
  await page.context().clearCookies();
  await signIn(page, { email: mgr.user.email, password: OWNER.password });
  await expect(page).toHaveURL(/\/hub$/);
  await page.goto(`/hub/team?id=${target.m.id}`);
  await expect(page.getByText(target.user.name).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Deactivate", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remove from workspace" })).toHaveCount(0);
});

test("transfer ownership needs the password, only goes to an Admin, and both people are emailed", async ({ page }) => {
  const org = await prisma.organization.create({ data: { name: `E2E Ownership ${Date.now()}`, seatLimit: 10 } });
  const mkUser = async (key, role) => {
    const user = await prisma.user.create({ data: { email: testEmail(key), name: `Own ${key}`, passwordHash: await hash(), emailVerifiedAt: new Date() } });
    const m = await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role, status: "ACTIVE", joinedAt: new Date() } });
    return { user, m };
  };
  const owner = await mkUser("owner-x", "OWNER");
  const admin = await mkUser("admin-x", "ADMIN");
  await mkUser("member-x", "MEMBER");
  await signIn(page, { email: owner.user.email, password: OWNER.password });
  await expect(page).toHaveURL(/\/hub$/);
  await page.goto(`/hub/settings/ownership?to=${admin.m.id}`);
  const select = page.getByLabel("New owner");
  await expect(select.locator("option")).toHaveText(["Choose an Admin", `${admin.user.name} (${admin.user.email})`]); // members are not offered
  await expect(page.getByText(`${admin.user.name} becomes the owner.`)).toBeVisible();
  await page.getByLabel("Your password").fill("not-the-password-1");
  await page.getByRole("button", { name: "Transfer ownership" }).click();
  await expect(page.getByText("That password isn't right.")).toBeVisible();
  expect((await prisma.membership.findUnique({ where: { id: admin.m.id } })).role).toBe("ADMIN");
  await page.getByLabel("Your password").fill(OWNER.password);
  await page.getByRole("button", { name: "Transfer ownership" }).click();
  await expect(page.getByText(`${admin.user.name} is now the owner`)).toBeVisible();
  expect((await prisma.membership.findUnique({ where: { id: admin.m.id } })).role).toBe("OWNER");
  expect((await prisma.membership.findUnique({ where: { id: owner.m.id } })).role).toBe("ADMIN");
  expect(await prisma.emailLog.count({ where: { template: "team-ownership", to: { in: [owner.user.email, admin.user.email] } } })).toBe(2);
  // The page is for the owner only: now an Admin, this person gets a not-found page.
  await page.goto("/hub/settings/ownership");
  await expect(page.getByText(/could not be found/i)).toBeVisible();
});
