// Demo and test data. Never run against production.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed demo data in production.");
  process.exit(1);
}

const prisma = new PrismaClient();
const PASSWORD = "demo-password-123"; // demo only

const ALL = ["PROPOSALS", "APPOINTMENT", "CRM", "WORKDRIVE", "SOP", "INVOICING", "ACCOUNTING"];

const ago = (days, hours = 0) => new Date(Date.now() - days * 864e5 - hours * 36e5);

async function person(org, { name, email, role, apps, status = "ACTIVE", lastActiveAt = null, invitedAt = null, joinedDaysAgo = 60 }, passwordHash) {
  const user = await prisma.user.upsert({ where: { email }, update: { emailVerifiedAt: status === "ACTIVE" ? new Date() : null, passwordHash }, create: { email, name, passwordHash, emailVerifiedAt: status === "ACTIVE" ? new Date() : null } });
  const fields = {
    role,
    status,
    lastActiveAt,
    invitedAt,
    joinedAt: status === "ACTIVE" ? ago(joinedDaysAgo) : null,
  };
  const m = await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: fields,
    create: { userId: user.id, organizationId: org.id, ...fields },
  });
  // Keep seeded access exactly as listed, so re-running the seed resets drift from manual testing.
  await prisma.appAccess.deleteMany({ where: { membershipId: m.id, app: { notIn: apps } } });
  for (const app of apps) {
    await prisma.appAccess.upsert({
      where: { membershipId_app: { membershipId: m.id, app } },
      update: {},
      create: { membershipId: m.id, organizationId: org.id, app },
    });
  }
  return { user, m };
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // Organization A: "Unidesk Demo" (see 00-Foundations/01-Product-and-Scope.md)
  let a = await prisma.organization.findFirst({ where: { name: "Unidesk Demo" } });
  if (!a) a = await prisma.organization.create({ data: { name: "Unidesk Demo", plan: "growth", trialEndsAt: new Date(Date.now() + 30 * 864e5) } });
  const people = [
    { name: "Paul Smith", email: "demo@unidesk.com", role: "OWNER", apps: ALL, lastActiveAt: ago(0, 1), joinedDaysAgo: 120 },
    { name: "Maya Chen", email: "maya@unideskdemo.com", role: "ADMIN", apps: ["CRM", "INVOICING"], lastActiveAt: ago(0, 2), joinedDaysAgo: 90 },
    { name: "Ravi Patel", email: "ravi@unideskdemo.example", role: "ACCOUNTANT", apps: ["INVOICING", "ACCOUNTING"], lastActiveAt: ago(1), joinedDaysAgo: 80 },
    { name: "Sofia Alvarez", email: "sofia@unideskdemo.example", role: "MANAGER", apps: ["CRM", "WORKDRIVE", "SOP"], lastActiveAt: ago(2), joinedDaysAgo: 70 },
    { name: "Sumit Okafor", email: "sumit@unideskdemo.com", role: "MEMBER", apps: ["CRM", "APPOINTMENT"], lastActiveAt: ago(3), joinedDaysAgo: 50 },
    { name: "Jordan Lee", email: "jordan@northwind.example", role: "CLIENT", apps: ["WORKDRIVE", "PROPOSALS"], lastActiveAt: ago(7), joinedDaysAgo: 30 },
    { name: "Lena Fischer", email: "lena@unideskdemo.example", role: "MEMBER", apps: ["CRM"], status: "INVITED", invitedAt: ago(2) },
  ];
  const made = {};
  for (const p of people) made[p.name] = await person(a, p, passwordHash);
  // Reporting lines
  const reports = { "Maya Chen": "Paul Smith", "Ravi Patel": "Paul Smith", "Sofia Alvarez": "Maya Chen", "Sumit Okafor": "Sofia Alvarez", "Jordan Lee": "Ravi Patel", "Lena Fischer": "Sofia Alvarez" };
  for (const [who, boss] of Object.entries(reports)) {
    await prisma.membership.update({ where: { id: made[who].m.id }, data: { reportsToId: made[boss].m.id, invitedById: made[boss].m.id } });
  }
  // Shared data starts from the defaults (no rows), so tests and demos begin in a known state.
  await prisma.sharedDataSetting.deleteMany({ where: { organizationId: a.id } });
  // Lena's invite, so the Invites tab has a real waiting invite (sent 2 days ago, expires in 5). Its link is unknown by design.
  const lena = made["Lena Fischer"].m;
  const lenaInvite = {
    organizationId: a.id, email: "lena@unideskdemo.example", batchId: "seed", invitedById: made["Sofia Alvarez"].m.id, status: "PENDING",
    createdAt: ago(2), deliverAfter: ago(2), deliveredAt: ago(2), expiresAt: ago(-5), acceptedAt: null,
  };
  await prisma.invite.upsert({
    where: { membershipId: lena.id },
    update: lenaInvite,
    create: { ...lenaInvite, membershipId: lena.id, tokenHash: createHash("sha256").update(randomBytes(32)).digest("hex") },
  });
  // Sample activity (dev data only) so the "Recent activity" section can be checked.
  if ((await prisma.auditEvent.count({ where: { organizationId: a.id } })) === 0) {
    await prisma.auditEvent.createMany({
      data: [
        { organizationId: a.id, actorId: made["Maya Chen"].user.id, app: "invoicing", action: "invoice.created", summary: "Created invoice INV-1 for Northwind LLC", createdAt: ago(0, 2) },
        { organizationId: a.id, actorId: made["Maya Chen"].user.id, app: "hub", action: "client.created", summary: "Added client Northwind LLC", createdAt: ago(1) },
        { organizationId: a.id, actorId: made["Paul Smith"].user.id, app: "hub", action: "team.role_changed", summary: "Paul Smith changed Sofia Alvarez's role to Manager", createdAt: ago(2) },
      ],
    });
  }

  // Optional: make a real person the single owner of the demo organization (set DEMO_OWNER_EMAIL in the untracked .env).
  // The previous owner becomes an admin who reports to them. Their password is never touched here.
  const ownerEmail = process.env.DEMO_OWNER_EMAIL?.trim().toLowerCase();
  if (ownerEmail && ownerEmail !== "demo@unidesk.com") {
    const realOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (realOwner) {
      const mine = await prisma.membership.upsert({
        where: { userId_organizationId: { userId: realOwner.id, organizationId: a.id } },
        update: { role: "OWNER", status: "ACTIVE", reportsToId: null },
        create: { userId: realOwner.id, organizationId: a.id, role: "OWNER", status: "ACTIVE", joinedAt: new Date() },
      });
      for (const app of ALL) {
        await prisma.appAccess.upsert({ where: { membershipId_app: { membershipId: mine.id, app } }, update: {}, create: { membershipId: mine.id, organizationId: a.id, app } });
      }
      await prisma.membership.update({ where: { id: made["Paul Smith"].m.id }, data: { role: "ADMIN", reportsToId: mine.id } });
    }
  }

  const clients = [
    { name: "Northwind LLC", email: "jordan@northwind.example", projects: ["Monthly Bookkeeping", "2026 Tax Return"] },
    { name: "Harbor Dental", email: "office@harbor-dental.example", projects: [] },
    { name: "Cedar Dental Group", email: "hello@cedar-dental.example", projects: [] },
    { name: "Bluebird Bakery", email: null, projects: [] }, // no email on purpose: tests blocked sends
  ];
  for (const c of clients) {
    let client = await prisma.client.findFirst({ where: { organizationId: a.id, name: c.name } });
    if (!client) client = await prisma.client.create({ data: { organizationId: a.id, name: c.name, email: c.email } });
    for (const name of c.projects) {
      const exists = await prisma.project.findFirst({ where: { organizationId: a.id, clientId: client.id, name } });
      if (!exists) await prisma.project.create({ data: { organizationId: a.id, clientId: client.id, name } });
    }
  }

  // Organization B: a second firm, used by the isolation tests.
  let b = await prisma.organization.findFirst({ where: { name: "Harbor Advisory" } });
  if (!b) b = await prisma.organization.create({ data: { name: "Harbor Advisory" } });
  await person(b, { name: "Priya Nair", email: "priya@harboradvisory.example", role: "OWNER", apps: ALL }, passwordHash);
  if (!(await prisma.client.findFirst({ where: { organizationId: b.id, name: "Lakeside Cafe" } }))) {
    await prisma.client.create({ data: { organizationId: b.id, name: "Lakeside Cafe", email: "owner@lakeside.example" } });
  }
  console.log("Seeded: Unidesk Demo, Harbor Advisory. Demo password for every seeded user is in prisma/seed.mjs.");
}

main().finally(() => prisma.$disconnect());
