"use client";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { InviteButton } from "@/features/team/ui/InviteDrawer";
import { AppChips, RoleChip } from "@/features/team/ui/bits";
import { InviteBulkBar, InviteMenu, PersonCell, ResendButton, expiryText, sentText, useInvitesController } from "@/features/team/ui/invites-shared";
import { cn } from "@/components/ui/cn";

/** Glass: one calm card, a row per invite. "Select" turns on bulk Resend and Revoke. */
export function GlassInvites({ data, viewer }) {
  const { invites, pending, expired, timezone } = data;
  const c = useInvitesController(invites);
  const [selectMode, setSelectMode] = useState(false);
  const stop = () => { setSelectMode(false); c.clear(); };

  return (
    <div>
      {selectMode && c.selected.length ? <InviteBulkBar count={c.selected.length} busy={c.busy} onResend={() => c.resend(c.selected)} onRevoke={() => c.askRevoke(c.selected)} onClear={stop} /> : null}
      <section aria-label="Pending invites" className="bg-card p-6" style={{ borderRadius: "var(--card-radius)", border: "var(--card-border)" }}>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="font-display-theme text-[26px]">Pending invites</h2>
          <span className="tabular rounded-full bg-subtle-2 px-3 py-0.5 text-sm text-text">{pending}</span>
          {expired ? <span className="rounded-full bg-warning-soft px-3 py-0.5 text-sm text-warning">{expired} expired</span> : null}
          {invites.length ? <button type="button" onClick={() => { setSelectMode((s) => !s); c.clear(); }} className="ml-auto text-[13px] font-medium text-ink underline-offset-2 hover:underline">{selectMode ? "Cancel" : "Select"}</button> : null}
        </div>

        {invites.length === 0 ? (
          <EmptyState icon={MailCheck} title="No pending invites" text="Everyone you invited has joined." action={<InviteButton role={viewer.role} />} />
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {invites.map((inv) => (
              <li key={inv.id} className={cn("flex flex-wrap items-center gap-x-6 gap-y-3 py-4", inv.expired && "rounded-[16px] bg-warning-soft/50 px-3")}>
                {selectMode ? <input type="checkbox" aria-label={`Select ${inv.email}`} checked={c.selected.includes(inv.membershipId)} onChange={() => c.toggle(inv.membershipId)} className="size-4 accent-[var(--accent)]" /> : null}
                <div className="min-w-[220px] flex-1"><PersonCell inv={inv} size={44} /></div>
                <div className="flex min-w-[150px] flex-col gap-1.5"><RoleChip role={inv.role} /><AppChips apps={inv.apps} role={inv.role} max={2} /></div>
                <div className="min-w-[150px] text-sm">
                  <p className="text-text">Sent {sentText(inv)} by {inv.invitedByName}</p>
                  <p className={inv.expired ? "font-medium text-warning" : "text-muted"}>{inv.expired ? expiryText(inv, timezone) : `Expires ${expiryText(inv, timezone)}`}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <ResendButton inv={inv} onResend={c.resend} busy={c.busy} variant={inv.expired ? "primary" : "secondary"} />
                  <InviteMenu inv={inv} onCopy={c.copyLink} onRevoke={c.askRevoke} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {c.dialogs}
    </div>
  );
}
