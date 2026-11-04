import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Signed-out visitors to any protected page go to /hub/sign-in?next=<where they were going>.
 * This only checks that a session cookie exists and has not timed out. The full check (still a member? password reset?)
 * happens in getSession() on the server, where the database is available.
 */
const PUBLIC = ["/hub/sign-in", "/hub/sign-up", "/hub/verify-email", "/hub/forgot-password", "/hub/reset-password", "/invite", "/terms", "/privacy", "/dev"];

export async function middleware(req) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();

  // Behind a proxy the app may see http while the browser used https, which changes the session cookie name.
  const proto = (req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol).replace(":", "").split(",")[0].trim();
  const secure = proto === "https";
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie: secure, salt: secure ? "__Secure-authjs.session-token" : "authjs.session-token" });
  if (token?.userId && (!token.expiresAt || token.expiresAt > Date.now())) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/hub/sign-in";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
