"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, PasswordInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { emailSchema } from "@/lib/validators/auth";
import { resendVerificationAction, signInAction } from "../actions";
import { AuthFooter, AuthLink, withNetworkBanner } from "./bits";

const submit = withNetworkBanner(signInAction);
const msg = (schema, v) => { const r = schema.safeParse(v); return r.success ? undefined : r.error.issues[0].message; };

/** Sign in (Hub flow 01). Errors appear after a field is left or the form is sent, never while typing. */
export function SignInForm({ next }) {
  const toast = useToast();
  const formRef = useRef(null);
  const [state, formAction, pending] = useActionState(submit, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, startResend] = useTransition();

  useEffect(() => {
    if (!state.stamp) return;
    if (state.fields?.email != null) setEmail(state.fields.email);
    setPassword(""); // the password clears after a failed try
    if (state.focusPassword) setTimeout(() => formRef.current?.elements.password?.focus(), 0);
  }, [state.stamp]); // eslint-disable-line react-hooks/exhaustive-deps

  function resend() {
    const fd = new FormData();
    fd.set("email", email);
    startResend(async () => {
      const r = await resendVerificationAction(null, fd);
      toast({ kind: r.sent ? "success" : "info", message: r.sent ? "We sent a new link. Check your inbox." : r.error ?? "We sent one a moment ago. Give it a minute." });
    });
  }

  const b = state.banner;
  return (
    <>
      {b ? (
        <div className="mb-5">
          <Banner kind={b.kind}>
            <p>{b.text}</p>
            {b.link ? <p className="mt-1"><Link href={b.link.href} className="font-medium underline">{b.link.label}</Link></p> : null}
            {b.resend ? <div className="mt-2"><Button size="sm" variant="ghost" type="button" onClick={resend}>Send it again</Button></div> : null}
            {b.retry ? <div className="mt-2"><Button size="sm" variant="ghost" type="button" onClick={() => formRef.current?.requestSubmit()}>Retry</Button></div> : null}
          </Banner>
        </div>
      ) : null}
      <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Input label="Work email" name="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} error={state.errors?.email ?? msg(emailSchema, email)} showError={!!state.errors?.email} />
        <div>
          <PasswordInput label="Password" name="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={state.errors?.password ?? (password ? undefined : "Enter your password")} showError={!!state.errors?.password} />
          <p className="mt-2 text-right text-sm"><AuthLink href="/hub/forgot-password">Forgot password?</AuthLink></p>
        </div>
        <Checkbox label="Keep me signed in" name="keep" defaultChecked />
        <Button type="submit" variant="primary" loading={pending} className="w-full">Sign in</Button>
      </form>
      <AuthFooter>New to Unidesk? <AuthLink href="/hub/sign-up">Start free trial</AuthLink></AuthFooter>
    </>
  );
}
