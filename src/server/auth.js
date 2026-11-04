import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma.js";
import { afterSignIn, confirmEmail, verifyCredentials } from "./auth-flow.js";
import { getIpHash } from "./request.js";
import { loadValidUser } from "./session-check.js";
import { signInSchema } from "@/lib/validators/auth";

export const THIRTY_DAYS = 30 * 24 * 3600 * 1000;
export const TWELVE_HOURS = 12 * 3600 * 1000;

/** Why a sign-in was refused. The code travels to the form, which shows the matching message. */
class SignInRefused extends CredentialsSignin {
  constructor(code) {
    super();
    this.code = code;
  }
}

async function membershipFor(userId, preferredOrgId) {
  const list = await prisma.membership.findMany({ where: { userId, status: "ACTIVE" }, include: { appAccess: true }, orderBy: { createdAt: "asc" } });
  const m = list.find((x) => x.organizationId === preferredOrgId) ?? list[0];
  return m ? { orgId: m.organizationId, role: m.role, apps: m.appAccess.map((a) => a.app) } : { orgId: null, role: null, apps: [] };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 3600, updateAge: 3600 },
  pages: { signIn: "/hub/sign-in" },
  trustHost: true,
  providers: [
    Credentials({
      id: "credentials",
      async authorize(raw) {
        const parsed = signInSchema.safeParse({ ...raw, keep: raw?.keep === "true" });
        if (!parsed.success) throw new SignInRefused("invalid");
        const r = await verifyCredentials(parsed.data.email, parsed.data.password, await getIpHash());
        if (!r.ok) throw new SignInRefused(r.reason === "removed" ? `removed:${r.orgName}` : r.reason);
        return { id: r.user.id, email: r.user.email, name: r.user.name, keep: parsed.data.keep };
      },
    }),
    // The link in the confirmation email signs the person in.
    Credentials({
      id: "email-link",
      async authorize(raw) {
        const r = await confirmEmail(raw?.token);
        if (r.status !== "ok") throw new SignInRefused(r.status);
        return { id: r.user.id, email: r.user.email, name: r.user.name, keep: true };
      },
    }),
  ],
  callbacks: {
    // One session for every module. The token carries who, which organization, and how long it lasts.
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.keep = user.keep !== false;
        await afterSignIn(user.id);
        const u = await prisma.user.findUnique({ where: { id: user.id } });
        Object.assign(token, await membershipFor(user.id, u?.lastOrganizationId));
      } else if (!(await loadValidUser(token))) {
        // Auth.js calls this on every session request, including GET /api/auth/session, and re-signs the cookie.
        // Refusing here means a cookie that is idle, expired, from before a password reset, or for a removed person
        // cannot be refreshed back to life. Returning null ends the session.
        return null;
      }
      // 30 days with activity, or 12 hours without "Keep me signed in". Only a still-valid token moves forward.
      token.expiresAt = Date.now() + (token.keep ? THIRTY_DAYS : TWELVE_HOURS);
      return token;
    },
    async session({ session, token }) {
      session.userId = token.userId;
      session.orgId = token.orgId ?? null;
      session.expiresAt = token.expiresAt;
      session.issuedAt = token.iat;
      return session;
    },
  },
});
