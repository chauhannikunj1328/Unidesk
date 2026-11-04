import { cookies } from "next/headers";

/** The email a person just signed up with, kept in a short-lived private cookie (never in the URL). */
const NAME = "pending-verify";
export const setPendingEmail = async (email) => (await cookies()).set(NAME, email, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 24 * 3600 });
export const getPendingEmail = async () => (await cookies()).get(NAME)?.value ?? null;
