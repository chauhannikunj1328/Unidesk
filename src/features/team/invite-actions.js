"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { getSession, getIdentity } from "@/server/session";
import { AccessError } from "@/server/access";
import { signIn } from "@/server/auth";
import { getIpHash } from "@/server/request";
import { allowPublicForm } from "@/server/rate-limit";
import { ALL_APPS, ROLES } from "./constants";
import { MAX_INVITES, NOTE_MAX } from "./invite-rules";
import { createInvites, deliverInvites, issueInviteLink, resendInvite, resendInvites, revokeInvites, undoInvites } from "./invites";
import { acceptSignedIn, acceptWithNewAccount } from "./accept";
import { landingFor } from "@/lib/landing";

/** Server Actions for inviting people. Validate with Zod, then call the shared logic. Same for every theme. */

const id = z.string().min(1).max(64);

async function run(schema, input, fn, { refresh = true } = {}) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Something in that request wasn't valid." };
  const session = await getSession();
  try {
    const result = await fn(session, parsed.data);
    if (refresh) revalidatePath("/hub/team", "layout");
    return result;
  } catch (e) {
    if (e instanceof AccessError) return { ok: false, error: "You don't have access to invite people." };
    throw e;
  }
}

export async function sendInvitesAction(input) {
  return run(
    z.object({
      emails: z.array(z.string().trim().min(1).max(254)).min(1).max(MAX_INVITES),
      role: z.enum(ROLES),
      apps: z.array(z.enum(ALL_APPS)).max(ALL_APPS.length),
      reportsToId: id.nullish(),
      note: z.string().max(NOTE_MAX).optional(),
      clientId: id.nullish(),
    }),
    input,
    createInvites
  );
}

export async function deliverInvitesAction(input) {
  return run(z.object({ batchId: id }), input, deliverInvites, { refresh: false });
}

export async function undoInvitesAction(input) {
  return run(z.object({ batchId: id }), input, undoInvites);
}

export async function resendInviteAction(input) {
  return run(z.object({ membershipId: id }), input, resendInvite);
}

const ids = z.array(id).min(1).max(100);
export async function resendInvitesAction(input) {
  return run(z.object({ membershipIds: ids }), input, resendInvites);
}
export async function revokeInvitesAction(input) {
  return run(z.object({ membershipIds: ids }), input, revokeInvites);
}
export async function copyInviteLinkAction(input) {
  return run(z.object({ membershipId: id }), input, issueInviteLink, { refresh: false });
}

/** "Join" on the invite page, for someone with no account yet. Signs them in and opens their workspace. */
export async function acceptNewAccountAction(_prev, formData) {
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "");
  const password = String(formData.get("password") ?? "");
  const fields = { name };
  if (!(await allowPublicForm("invite", await getIpHash()))) return { banner: { kind: "danger", text: "Too many attempts. Try again in 15 minutes." }, fields, stamp: Date.now() };
  const r = await acceptWithNewAccount(token, { name, password, termsAccepted: formData.get("terms") === "on" });
  if (!r.ok) {
    if (r.status) redirect(`/invite/${token}`); // the page shows the matching message
    return { errors: r.errors, fields, stamp: Date.now() };
  }
  try {
    await signIn("credentials", { email: r.email, password, keep: "true", redirect: false });
  } catch (e) {
    if (!(e instanceof AuthError)) throw e;
    redirect("/hub/sign-in");
  }
  redirect(landingFor({ orgId: "x", role: r.roleCode }));
}

/** "Accept invite" for someone who already has an account and is signed in as the invited email. */
export async function acceptSignedInAction(formData) {
  const token = String(formData.get("token") ?? "");
  const identity = await getIdentity();
  if (!identity) redirect(`/hub/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`);
  const r = await acceptSignedIn(token, { userId: identity.user.id, email: identity.user.email });
  if (!r.ok) redirect(`/invite/${token}`);
  revalidatePath("/hub", "layout");
  redirect(landingFor({ orgId: "x", role: r.roleCode }));
}
