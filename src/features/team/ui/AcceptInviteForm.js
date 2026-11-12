"use client";
import { useActionState, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, PasswordInput } from "@/components/ui/Field";
import { passwordProblem } from "@/lib/validators/auth";
import { acceptNewAccountAction } from "../invite-actions";
import { withNetworkBanner } from "@/features/auth/ui/bits";

const submit = withNetworkBanner(acceptNewAccountAction);

/** Join form for someone with no account yet. Name, password, terms: nothing else is asked. */
export function AcceptInviteForm({ token, defaultName, orgName }) {
  const [state, formAction, pending] = useActionState(submit, {});
  const [name, setName] = useState(defaultName);
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const e = state.errors ?? {};
  return (
    <>
      {state.banner ? <div className="mb-5"><Banner kind={state.banner.kind}>{state.banner.text}</Banner></div> : null}
      {e.form ? <div className="mb-5"><Banner kind="danger">{e.form}</Banner></div> : null}
      <form action={formAction} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />
        <Input label="Your name" name="name" autoComplete="name" required value={name} onChange={(ev) => setName(ev.target.value)} error={e.name ?? (name.trim() ? undefined : "Enter your name")} showError={!!e.name} />
        <PasswordInput label="Choose a password" name="password" autoComplete="new-password" required help="At least 10 characters" value={password} onChange={(ev) => setPassword(ev.target.value)} error={e.password ?? passwordProblem(password) ?? undefined} showError={!!e.password} />
        <Checkbox
          name="terms"
          checked={terms}
          onChange={(ev) => setTerms(ev.target.checked)}
          error={e.terms}
          showError={!!e.terms}
          label={<>I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline">Privacy Policy</a></>}
        />
        <Button type="submit" variant="primary" loading={pending} className="w-full">Join {orgName}</Button>
      </form>
    </>
  );
}
