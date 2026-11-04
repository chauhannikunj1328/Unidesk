import { createHmac } from "node:crypto";
import { headers } from "next/headers";

/** The caller's address, hashed with a secret. Raw addresses are never stored or shown. */
export async function getIpHash() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  return createHmac("sha256", process.env.AUTH_SECRET ?? "dev").update(ip).digest("hex").slice(0, 32);
}

/** Absolute base URL for links in emails. */
export function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
