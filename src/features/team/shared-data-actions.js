"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/server/session";
import { AccessError } from "@/server/access";
import { ALL_APPS } from "./constants";
import { DATA_TYPES } from "./shared-data-rules";
import { changeSharedData, restoreSharedData } from "./shared-data";

/** Server Actions for Shared data. Validate with Zod, then call the shared logic. Same for every theme. */

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
    if (e instanceof AccessError) return { ok: false, error: "Only owners and admins can change shared data." };
    throw e;
  }
}

export async function setSharedDataAction(input) {
  return run(z.object({ app, type: z.enum(DATA_TYPES), enabled: z.boolean() }), input, changeSharedData);
}

export async function restoreSharedDataAction(input) {
  return run(z.object({ app, values: z.object({ contacts: z.boolean(), clients: z.boolean(), projects: z.boolean() }) }), input, restoreSharedData);
}
