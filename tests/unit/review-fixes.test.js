import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/prisma";
import { allowPublicForm, PUBLIC_FORM_LIMIT } from "@/server/rate-limit";
import { sendEmail } from "@/server/email";
import { changeManager } from "@/features/team/core";
import { getTeam } from "@/features/team/queries";
import { AccessError } from "@/server/access";

const stamp = Date.now();
afterAll(async () => {
  await prisma.loginAttempt.deleteMany({ where: { email: { contains: `-${stamp}` } } });
  await prisma.emailLog.deleteMany({ where: { to: { endsWith: `-${stamp}@review.test` } } });
  await prisma.$disconnect();
});

describe("public form limit", () => {
  it("allows 10 uses per 15 minutes per address, then refuses", async () => {
    const ip = `ip-${stamp}`;
    for (let i = 0; i < PUBLIC_FORM_LIMIT; i++) expect(await allowPublicForm("signup", ip)).toBe(true);
    expect(await allowPublicForm("signup", ip)).toBe(false);
    expect(await allowPublicForm("forgot", ip)).toBe(true); // each form has its own count
    expect(await allowPublicForm("signup", `other-${stamp}`)).toBe(true);
  });
});

describe("email log", () => {
  it("keeps the link in development and removes it in production", async () => {
    const link = "http://localhost:3000/hub/reset-password/SECRETTOKEN";
    const mail = { subject: "s", template: "t", text: `Use ${link} now`, link };
    const dev = await sendEmail({ to: `dev-${stamp}@review.test`, ...mail });
    expect(dev.link).toBe(link);
    vi.stubEnv("NODE_ENV", "production");
    const prod = await sendEmail({ to: `prod-${stamp}@review.test`, ...mail });
    vi.unstubAllEnvs();
    expect(prod.link).toBeNull();
    expect(prod.body).not.toContain("SECRETTOKEN");
    expect(prod.body).toContain("[link removed]");
  });
});

describe("team rules added in review", () => {
  it("cannot make a client or a removed person someone's manager", async () => {
    const org = await prisma.organization.findFirst({ where: { name: "Unidesk Demo" } });
    const owner = await prisma.membership.findFirst({ where: { organizationId: org.id, role: "OWNER" }, include: { user: true } });
    const client = await prisma.membership.findFirst({ where: { organizationId: org.id, role: "CLIENT" } });
    const member = await prisma.membership.findFirst({ where: { organizationId: org.id, role: "MEMBER", status: "ACTIVE" } });
    const session = { userId: owner.userId, name: owner.user.name, orgId: org.id, role: "OWNER", membershipId: owner.id, apps: [] };
    const r = await changeManager(session, { membershipId: member.id, reportsToId: client.id });
    expect(r.ok).toBe(false);
  });
  it("clients cannot read the team list", async () => {
    await expect(getTeam({ userId: "u", orgId: "o", role: "CLIENT", apps: [] })).rejects.toBeInstanceOf(AccessError);
  });
});
