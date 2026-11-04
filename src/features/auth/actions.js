"use server";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/server/auth";
import { setPendingEmail, getPendingEmail } from "@/server/pending";
import { getIpHash } from "@/server/request";
import { allowPublicForm } from "@/server/rate-limit";
import { identityByEmail, identityForVerifyToken, registerUser, requestPasswordReset, resendVerification, resendWaitSeconds, resetPassword } from "@/server/auth-flow";
import { fieldErrors, forgotSchema, resetSchema, signInSchema, signUpSchema, emailSchema } from "@/lib/validators/auth";
import { landingFor } from "@/lib/landing";

/**
 * Server Actions for Hub flow 01. Each returns plain data the forms can show; successful ones redirect.
 * Messages are the exact words from 01-sign-in-and-sign-up.md.
 */

const setPending = setPendingEmail;

const BANNERS = {
  invalid: { kind: "danger", text: "Email or password is incorrect." },
  locked: { kind: "danger", text: "Too many attempts. Try again in 15 minutes or reset your password.", link: { label: "Reset password", href: "/hub/forgot-password" } },
  unverified: { kind: "warning", resend: true },
  network: { kind: "danger", text: "We couldn't reach Unidesk. Check your connection and try again.", retry: true },
};

/** @returns {Promise<{ ok?: boolean, banner?: object, fields?: object, errors?: object, stamp: number }>} */
export async function signInAction(_prev, formData) {
  const raw = { email: formData.get("email"), password: formData.get("password"), keep: formData.get("keep") === "on" };
  const parsed = signInSchema.safeParse(raw);
  const email = String(raw.email ?? "");
  if (!parsed.success) return { errors: fieldErrors(parsed.error), fields: { email }, stamp: Date.now() };

  let landing;
  try {
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, keep: String(parsed.data.keep), redirect: false });
    landing = await identityByEmail(parsed.data.email);
  } catch (e) {
    if (!(e instanceof AuthError)) throw e;
    const code = String(e.code ?? "invalid");
    if (code.startsWith("removed:")) return { banner: { kind: "warning", text: `Your access to ${code.slice(8)} was removed. Ask the owner to invite you again.` }, fields: { email }, stamp: Date.now() };
    if (code === "unverified") return { banner: { ...BANNERS.unverified, text: `Confirm your email first. We sent a link to ${parsed.data.email}.` }, fields: { email }, stamp: Date.now() };
    return { banner: BANNERS[code] ?? BANNERS.invalid, fields: { email }, focusPassword: true, stamp: Date.now() };
  }
  const next = formData.get("next");
  redirect(landingFor(landing ?? { orgId: null }, typeof next === "string" ? next : undefined));
}

export async function signUpAction(_prev, formData) {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    terms: formData.get("terms") === "on",
    referralCode: formData.get("referralCode") || "",
  };
  const fields = { name: String(raw.name ?? ""), email: String(raw.email ?? ""), referralCode: String(raw.referralCode ?? ""), terms: raw.terms };
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), fields, stamp: Date.now() };
  if (!(await allowPublicForm("signup", await getIpHash()))) return { banner: { kind: "danger", text: "Too many attempts. Try again in 15 minutes." }, fields, stamp: Date.now() };
  const r = await registerUser(parsed.data);
  if (!r.ok) return { errors: r.errors, fields, stamp: Date.now() };
  await setPending(parsed.data.email);
  redirect("/hub/verify-email");
}

/** "Send it again" from the sign-in banner, the inbox page, or an expired link. */
export async function resendVerificationAction(_prev, formData) {
  const typed = formData?.get?.("email");
  const email = (typeof typed === "string" && typed) || (await getPendingEmail());
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { error: "Enter your work email to get a new link.", stamp: Date.now() };
  if (await allowPublicForm("resend", await getIpHash())) await resendVerification(parsed.data);
  await setPending(parsed.data);
  return { sent: true, wait: await resendWaitSeconds(parsed.data), stamp: Date.now() };
}

export async function forgotPasswordAction(_prev, formData) {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), fields: { email: String(formData.get("email") ?? "") }, stamp: Date.now() };
  const email = parsed.data.email;
  const allowed = await allowPublicForm("forgot", await getIpHash());
  // Work happens after the response is sent, so a known and an unknown email take the same time (no timing clue).
  if (allowed) after(() => requestPasswordReset(email));
  return { done: true, stamp: Date.now() }; // the same answer whether or not the account exists
}

export async function resetPasswordAction(_prev, formData) {
  const token = String(formData.get("token") ?? "");
  const parsed = resetSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), stamp: Date.now() };
  const r = await resetPassword(token, parsed.data.password);
  if (r.invalid) return { invalid: true, stamp: Date.now() };
  if (!r.ok) return { errors: r.errors, stamp: Date.now() };
  redirect("/hub/sign-in?reset=1");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/hub/sign-in?signedout=1" });
}


/**
 * The button on the confirmation page. Opening the emailed link only shows the page; this is what uses the link,
 * so mail scanners that open links cannot use it up. Signs the person in and opens onboarding.
 */
export async function confirmEmailAction(formData) {
  const token = String(formData.get("token") ?? "");
  try {
    await signIn("email-link", { token, redirect: false });
  } catch (e) {
    if (!(e instanceof AuthError)) throw e;
    redirect(`/hub/verify-email?status=${e.code === "expired" ? "expired" : "invalid"}`);
  }
  redirect(landingFor(await identityForVerifyToken(token)));
}
