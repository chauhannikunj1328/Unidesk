import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/prisma";
import { loadValidUser } from "@/server/session-check";

/** The rule behind "a reset, a removal or an idle timeout ends a session, and the session endpoint cannot undo it". */
const stamp = Date.now();
let org, user, loner;

beforeAll(async () => {
  org = await prisma.organization.create({ data: { name: `Session Org ${stamp}` } });
  user = await prisma.user.create({ data: { email: `s1-${stamp}@sess.test`, name: "S One" } });
  loner = await prisma.user.create({ data: { email: `s2-${stamp}@sess.test`, name: "S Two" } });
  await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role: "MEMBER", status: "ACTIVE" } });
  await prisma.membership.create({ data: { userId: loner.id, organizationId: org.id, role: "MEMBER", status: "INACTIVE" } });
});
afterAll(async () => {
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${stamp}@sess.test` } } });
  await prisma.$disconnect();
});

const nowS = () => Math.floor(Date.now() / 1000);

describe("loadValidUser", () => {
  it("accepts a fresh token for an active person", async () => {
    expect((await loadValidUser({ userId: user.id, iat: nowS(), expiresAt: Date.now() + 1000 }))?.id).toBe(user.id);
  });
  it("refuses a missing token, an unknown user and a token with no user", async () => {
    expect(await loadValidUser(null)).toBeNull();
    expect(await loadValidUser({})).toBeNull();
    expect(await loadValidUser({ userId: "nope", iat: nowS() })).toBeNull();
  });
  it("refuses a token past its idle limit, and does not let a later call revive it", async () => {
    const old = { userId: user.id, iat: nowS() - 7200, expiresAt: Date.now() - 1000 };
    expect(await loadValidUser(old)).toBeNull();
  });
  it("refuses a token issued before a password reset", async () => {
    const issued = nowS() - 60;
    await prisma.user.update({ where: { id: user.id }, data: { sessionsValidAfter: new Date() } });
    expect(await loadValidUser({ userId: user.id, iat: issued, expiresAt: Date.now() + 1000 })).toBeNull();
    // A cookie re-signed AFTER the reset (a new sign-in) is fine.
    expect(await loadValidUser({ userId: user.id, iat: nowS() + 2, expiresAt: Date.now() + 1000 })).not.toBeNull();
    await prisma.user.update({ where: { id: user.id }, data: { sessionsValidAfter: null } });
  });
  it("refuses a person removed from every organization", async () => {
    expect(await loadValidUser({ userId: loner.id, iat: nowS(), expiresAt: Date.now() + 1000 })).toBeNull();
  });
});
