"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { PasswordInput, Select } from "@/components/ui/Field";
import { transferOwnershipAction } from "../lifecycle-actions";

/** Hand ownership to an Admin. Needs the owner's password again; says plainly what changes. */
export function TransferOwnershipForm({ admins, defaultTo, ownerName }) {
  const [state, formAction, pending] = useActionState(transferOwnershipAction, {});
  const [to, setTo] = useState(admins.some((a) => a.id === defaultTo) ? defaultTo : "");
  const chosen = admins.find((a) => a.id === to);

  if (state.ok) {
    return (
      <div className="flex flex-col items-start gap-4" role="status">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-success-soft text-success"><CircleCheck size={26} strokeWidth={1.75} aria-hidden /></span>
        <h2 className="font-display-theme text-[26px]">{state.newOwner} is now the owner</h2>
        <p className="max-w-[60ch] text-text">You are an Admin now, and you keep every app. Both of you were sent an email. Only the owner can change billing and delete the organization.</p>
        <Link href="/hub/team"><Button variant="primary">Back to Team</Button></Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex max-w-[520px] flex-col gap-5">
      {state.error ? <Banner kind="danger">{state.error}</Banner> : null}
      {admins.length === 0 ? <Banner kind="info">Ownership can only go to an Admin. Make someone an Admin on the People page first.</Banner> : null}
      <Select label="New owner" name="to" required value={to} onChange={(e) => setTo(e.target.value)} help="Only Admins can become the owner." options={[{ value: "", label: "Choose an Admin" }, ...admins.map((a) => ({ value: a.id, label: `${a.name} (${a.email})` }))]} />
      <div className="rounded-[16px] bg-subtle px-4 py-3 text-sm text-text" aria-live="polite">
        {chosen ? `${chosen.name} becomes the owner. ` : "The person you choose becomes the owner. "}
        You ({ownerName}) become an Admin and keep every app. Only the owner can change billing and delete the organization.
      </div>
      <PasswordInput label="Your password" name="password" autoComplete="current-password" required help="We ask again because this can't be done by accident." />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="danger" loading={pending} disabled={!to}>Transfer ownership</Button>
        <Link href="/hub/team"><Button>Cancel</Button></Link>
      </div>
    </form>
  );
}
