"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/server/session";
import { AccessError } from "@/server/access";
import { bulkChange, changeAppAccess, changeManager, changeRole } from "./core";
import { ALL_APPS, ROLES } from "./constants";

/** Server Actions for Team. Validate with Zod, then call the shared core. Safe to call from any theme. */

const id = z.string().min(1).max(64);
const app = z.enum(ALL_APPS);

async function run(schema, input, fn) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Something in that request wasn't valid." };
  const session = await getSession();
  try {
    const result = await fn(session, parsed.data);
    if (result.ok) revalidatePath("/hub/team", "layout");
    return result;
  } catch (e) {
    if (e instanceof AccessError) return { ok: false, error: "You don't have access to change this." };
    throw e;
  }
}

export async function setAppAccessAction(input) {
  return run(z.object({ membershipId: id, app, enabled: z.boolean() }), input, changeAppAccess);
}

export async function setRoleAction(input) {
  return run(z.object({ membershipId: id, role: z.enum(ROLES) }), input, changeRole);
}

export async function setManagerAction(input) {
  return run(z.object({ membershipId: id, reportsToId: id }), input, changeManager);
}

export async function bulkChangeAction(input) {
  return run(
    z.object({
      membershipIds: z.array(id).min(1).max(100),
      change: z.discriminatedUnion("type", [
        z.object({ type: z.literal("access"), app, enabled: z.boolean() }),
        z.object({ type: z.literal("role"), role: z.enum(ROLES) }),
        z.object({ type: z.literal("manager"), reportsToId: id }),
      ]),
    }),
    input,
    bulkChange
  );
}
