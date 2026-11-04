import { PrismaClient } from "@prisma/client";
import { expect } from "@playwright/test";

/** Shared helpers for browser tests. They use the demo data from `npm run db:seed`. Never run against production. */
export const prisma = new PrismaClient();
export const OWNER = { email: "demo@unidesk.com", password: "demo-password-123" };
export const CLIENT = { email: "jordan@northwind.example", password: "demo-password-123" };
export const STRONG = "a-Good-passphrase-7";
export const THEMES = ["glass", "pastel", "grove"];

export const stamp = Date.now();
export const testEmail = (key) => `${key}-${stamp}@e2e.test`;

export async function setTheme(page, theme) {
  await page.context().addCookies([{ name: "theme", value: theme, url: "http://localhost:3000" }]);
}

export async function clearAttempts() {
  await prisma.loginAttempt.deleteMany({});
}

export async function signIn(page, { email, password }, next) {
  await page.goto(`/hub/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.getByLabel("Work email").fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function emailLink(to, template) {
  await expect.poll(async () => (await prisma.emailLog.findFirst({ where: { to, template }, orderBy: { createdAt: "desc" } }))?.link ?? null).not.toBeNull();
  return (await prisma.emailLog.findFirst({ where: { to, template }, orderBy: { createdAt: "desc" } })).link;
}

export async function cleanup() {
  await prisma.auditEvent.deleteMany({ where: { summary: { contains: "@e2e.test" } } });
  await prisma.emailLog.deleteMany({ where: { to: { endsWith: "@e2e.test" } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@e2e.test" } } });
  await prisma.loginAttempt.deleteMany({});
}
