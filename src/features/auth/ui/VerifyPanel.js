"use client";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Mail, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { emailSchema } from "@/lib/validators/auth";
import { resendVerificationAction } from "../actions";
import { AuthFooter, AuthLink } from "./bits";

/** "Check your inbox", plus the expired and no-longer-works variants. Resend waits 60 seconds between sends. */
export function VerifyPanel({ email, status, wait: initialWait }) {
  const [state, formAction, pending] = useActionState(resendVerificationAction, {});
  const [wait, setWait] = useState(initialWait ?? 0);
  const [typed, setTyped] = useState("");
  const [lastStamp, setLastStamp] = useState(0);
  if (state.stamp && state.stamp !== lastStamp) {
    setLastStamp(state.stamp);
    if (state.sent) setWait(state.wait ?? 60);
  }
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const broken = status === "expired" || status === "invalid";
  const title = status === "expired" ? "This link has expired" : status === "invalid" ? "This link no longer works" : "Check your inbox";
  const Icon = broken ? MailWarning : Mail;
  const needEmail = !email;

  return (
    <div className="flex flex-col items-center text-center">
      <span className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-subtle text-muted"><Icon size={32} strokeWidth={1.5} aria-hidden /></span>
      <h1 className="auth-title font-display-theme">{title}</h1>
      <p className="mt-2 text-text">
        {broken ? "Confirmation links work for 24 hours and only once. We can send you a new one." : <>We sent a link to <strong className="text-ink">{email}</strong>. Open it to confirm your email and set up your organization.</>}
      </p>
      <form action={formAction} className="mt-6 flex w-full flex-col gap-3 text-left">
        {needEmail ? <Input label="Work email" name="email" type="email" autoComplete="username" value={typed} onChange={(e) => setTyped(e.target.value)} error={emailSchema.safeParse(typed).success ? undefined : "Enter a valid email address"} showError={!!state.error} /> : null}
        {state.error && !needEmail ? <p className="text-sm text-danger">{state.error}</p> : null}
        <Button type="submit" variant={broken ? "primary" : "secondary"} loading={pending} disabled={wait > 0} className="w-full">
          {wait > 0 ? `Send again in ${wait}s` : broken ? "Send a new link" : "Send it again"}
        </Button>
        {state.sent ? <p role="status" className="text-center text-sm text-text">We sent a new link. Check your inbox.</p> : null}
      </form>
      <AuthFooter>{broken ? <AuthLink href="/hub/sign-in">Back to sign in</AuthLink> : <><Link href="/hub/sign-up" className="font-medium text-ink underline underline-offset-2">Use a different email</Link></>}</AuthFooter>
    </div>
  );
}
