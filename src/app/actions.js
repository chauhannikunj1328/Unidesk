"use server";
import { cookies } from "next/headers";
import { z } from "zod";

const themeSchema = z.enum(["glass", "pastel", "grove"]);

/** Phase 0: remember the theme in a cookie. Replaced by saving user.theme in Hub flow 24. */
export async function setThemeAction(theme) {
  const parsed = themeSchema.parse(theme);
  (await cookies()).set("theme", parsed, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
