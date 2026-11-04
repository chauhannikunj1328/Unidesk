"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Input, PasswordInput } from "@/components/ui/Field";
import { emailSchema, passwordProblem } from "@/lib/validators/auth";
import { forgotPasswordAction, resetPasswordAction } from "../actions";
import { AuthFooter, AuthLink, withNetworkBanner } from "./bits";

const forgot = withNetworkBanner(forgotPasswordAction);
const reset = withNetworkBanner(resetPasswordAction);
const msg = (schema, v) => { const r = schema.safeParse(v); return r.success ? undefined : r.error.issues[0].message; };

/** After sending, the same words appear whether or not the account exists (no account enumeration). */
export function ForgotForm() {
  const [state, formAction, pending] = useActionState(forgot, {});
  const [email, setEmail] = useState("");
  if (state.done) {
    return (
      <>
        <Banner kind="info">If an account exists for that email, we sent a reset link. It works for 1 hour.</Banner>
        <AuthFooter><AuthLink href="/hub/sign-in">Back to sign in</AuthLink></AuthFooter>
      </>
    );
  }
  return (
    <>
      {state.banner ? <div className="mb-5"><Banner kind={state.banner.kind}>{state.banner.text}</Banner></div> : null}
      <form action={formAction} noValidate className="flex flex-col gap-4">
        <Input label="Work email" name="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} error={state.errors?.email ?? msg(emailSchema, email)} showError={!!state.errors?.email} />
        <Button type="submit" variant="primary" loading={pending} className="w-full">Send reset link</Button>
      </form>
      <AuthFooter><AuthLink href="/hub/sign-in">Back to sign in</AuthLink></AuthFooter>
    </>
  );
}

export function ResetForm({ token }) {
  const [state, formAction, pending] = useActionState(reset, {});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  if (state.invalid) {
    return (
      <>
        <Banner kind="warning">This reset link no longer works. It may have been used already or it expired.</Banner>
        <div className="mt-5"><Link href="/hub/forgot-password"><Button variant="primary" className="w-full">Send a new link</Button></Link></div>
      </>
    );
  }
  const e = state.errors ?? {};
  return (
    <>
      {state.banner ? <div className="mb-5"><Banner kind={state.banner.kind}>{state.banner.text}</Banner></div> : null}
      <form action={formAction} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />
        <PasswordInput label="New password" name="password" autoComplete="new-password" required help="At least 10 characters" value={password} onChange={(ev) => setPassword(ev.target.value)} error={e.password ?? passwordProblem(password) ?? undefined} showError={!!e.password} />
        <PasswordInput label="Confirm new password" name="confirm" autoComplete="new-password" required value={confirm} onChange={(ev) => setConfirm(ev.target.value)} error={e.confirm ?? (confirm && confirm !== password ? "The passwords don't match." : undefined)} showError={!!e.confirm} />
        <Button type="submit" variant="primary" loading={pending} className="w-full">Save password</Button>
      </form>
    </>
  );
}
