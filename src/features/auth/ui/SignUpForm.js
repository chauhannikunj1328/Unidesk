"use client";
import { useActionState, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, PasswordInput } from "@/components/ui/Field";
import { emailSchema, passwordProblem } from "@/lib/validators/auth";
import { signUpAction } from "../actions";
import { AuthFooter, AuthLink, withNetworkBanner } from "./bits";

const submit = withNetworkBanner(signUpAction);
const msg = (schema, v) => { const r = schema.safeParse(v); return r.success ? undefined : r.error.issues[0].message; };

/** Create account (Hub flow 01). The organization is created later, in onboarding. */
export function SignUpForm({ referral }) {
  const [state, formAction, pending] = useActionState(submit, {});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showRef, setShowRef] = useState(Boolean(referral));
  const [terms, setTerms] = useState(false);
  const [lastStamp, setLastStamp] = useState(0);
  if (state.stamp && state.stamp !== lastStamp) {
    setLastStamp(state.stamp);
    if (state.fields) { setName(state.fields.name); setEmail(state.fields.email); }
    // The password stays in the browser so people do not retype it after a mistake elsewhere on the form.
  }
  const e = state.errors ?? {};
  const emailExists = e.email?.startsWith("An account with this email exists");

  return (
    <>
      {state.banner ? <div className="mb-5"><Banner kind={state.banner.kind}>{state.banner.text}</Banner></div> : null}
      <form action={formAction} noValidate className="flex flex-col gap-4">
        <Input label="Your name" name="name" autoComplete="name" required value={name} onChange={(ev) => setName(ev.target.value)} error={e.name ?? (name.trim() ? undefined : "Enter your name")} showError={!!e.name} />
        <div>
          <Input label="Work email" name="email" type="email" autoComplete="username" required value={email} onChange={(ev) => setEmail(ev.target.value)} error={e.email ?? msg(emailSchema, email)} showError={!!e.email} />
          {emailExists ? <p className="mt-1.5 text-xs"><AuthLink href="/hub/sign-in">Sign in</AuthLink></p> : null}
        </div>
        <PasswordInput label="Password" name="password" autoComplete="new-password" required help="At least 10 characters" value={password} onChange={(ev) => setPassword(ev.target.value)} error={e.password ?? passwordProblem(password) ?? undefined} showError={!!e.password} />
        {showRef ? (
          <Input label="Referral code" name="referralCode" defaultValue={referral ?? state.fields?.referralCode ?? ""} autoComplete="off" error={e.referralCode} showError={!!e.referralCode} />
        ) : (
          <button type="button" onClick={() => setShowRef(true)} className="self-start text-sm font-medium text-ink underline underline-offset-2">Have a referral code?</button>
        )}
        <Checkbox
          name="terms"
          checked={terms}
          onChange={(ev) => setTerms(ev.target.checked)}
          error={e.terms}
          showError={!!e.terms}
          label={<>I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline">Privacy Policy</a></>}
        />
        <Button type="submit" variant="primary" loading={pending} className="w-full">Create account</Button>
      </form>
      <AuthFooter>Already have an account? <AuthLink href="/hub/sign-in">Sign in</AuthLink></AuthFooter>
    </>
  );
}
