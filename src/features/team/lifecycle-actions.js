"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/server/session";
import { AccessError } from "@/server/access";
import { getIpHash } from "@/server/request";
import { deactivateMember, deactivateMembers, reactivateMember, removeMember, transferOwnership } from "./lifecycle";

/** Server Actions for deactivating, reactivating, removing and handing over ownership. Same for every theme. */

const id = z.string().min(1).max(64);

async function run(schema, input, fn) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Something in that request wasn't valid." };
  const session = await getSession();
  try {
    const result = await fn(session, parsed.data);
    if (result.ok || result.results) revalidatePath("/hub", "layout");
    return result;
  } catch (e) {
    if (e instanceof AccessError) return { ok: false, error: "You don't have access to do this." };
    throw e;
  }
}

export async function deactivateAction(input) {
  return run(z.object({ membershipId: id }), input, deactivateMember);
}
export async function reactivateAction(input) {
  return run(z.object({ membershipId: id }), input, reactivateMember);
}
export async function deactivateManyAction(input) {
  return run(z.object({ membershipIds: z.array(id).min(1).max(100) }), input, deactivateMembers);
}
export async function removeAction(input) {
  return run(z.object({ membershipId: id, clientsTo: id.optional(), reportsTo: id.optional(), confirm: z.string().max(20) }), input, removeMember);
}

/** The form on the ownership page. Needs the owner's password again. */
export async function transferOwnershipAction(_prev, formData) {
  const parsed = z.object({ to: id, password: z.string().min(1).max(128) }).safeParse({ to: formData.get("to"), password: formData.get("password") });
  if (!parsed.success) return { error: "Choose an Admin and enter your password.", stamp: Date.now() };
  const session = await getSession();
  try {
    const r = await transferOwnership(session, { toMembershipId: parsed.data.to, password: parsed.data.password }, await getIpHash());
    // No revalidation here: this page is for the owner, and a refresh right after the transfer would show "not found".
    // Every other page reads fresh data when it is opened.
    return { ...r, stamp: Date.now() };
  } catch (e) {
    if (e instanceof AccessError) return { error: "Only the owner can transfer ownership.", stamp: Date.now() };
    throw e;
  }
}
