"use client";
import { useState } from "react";
import { LayoutGrid, List, MailCheck } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { InviteButton } from "@/features/team/ui/InviteDrawer";
import { AppIconRow, RoleChip } from "@/features/team/ui/bits";
import { AppChips } from "@/features/team/ui/bits";
import { InviteBulkBar, InviteMenu, PersonCell, ResendButton, expiryText, sentText, useInvitesController } from "@/features/team/ui/invites-shared";
import { cn } from "@/components/ui/cn";

/** Grove: dashed cards, one per invite, with a cards/table switch. Expired ones use the warning tone. */
export function GroveInvites({ data, viewer }) {
  const { invites, pending, expired, timezone } = data;
  const c = useInvitesController(invites);
  const [view, setView] = useState("cards");
  const all = invites.length > 0 && c.selected.length === invites.length;

  const columns = [
    { key: "select", header: <input type="checkbox" aria-label="Select all invites" checked={all} onChange={(e) => c.setAll(e.target.checked)} className="size-4 accent-[var(--accent)]" />, render: (i) => <input type="checkbox" aria-label={`Select ${i.email}`} checked={c.selected.includes(i.membershipId)} onChange={() => c.toggle(i.membershipId)} className="size-4 accent-[var(--accent)]" /> },
    { key: "person", header: "Person", render: (i) => <PersonCell inv={i} /> },
    { key: "role", header: "Role", render: (i) => <RoleChip role={i.role} /> },
    { key: "apps", header: "Apps", render: (i) => <AppChips apps={i.apps} role={i.role} /> },
    { key: "by", header: "Invited by", render: (i) => i.invitedByName },
    { key: "sent", header: "Sent", render: (i) => <span className="text-muted">{sentText(i)}</span> },
    { key: "expires", header: "Expires", render: (i) => <span className={i.expired ? "font-medium text-warning" : "text-muted"}>{expiryText(i, timezone)}</span> },
    { key: "actions", header: <span className="sr-only">Actions</span>, align: "right", render: (i) => <span className="inline-flex items-center gap-2"><ResendButton inv={i} onResend={c.resend} busy={c.busy} variant={i.expired ? "primary" : "secondary"} /><InviteMenu inv={i} onCopy={c.copyLink} onRevoke={c.askRevoke} /></span> },
  ];

  return (
    <div>
      {c.selected.length ? <InviteBulkBar tone="green" count={c.selected.length} busy={c.busy} onResend={() => c.resend(c.selected)} onRevoke={() => c.askRevoke(c.selected)} onClear={c.clear} /> : null}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-display-theme mr-2 flex items-center gap-2 text-[28px]">Pending invites <span className="tabular rounded-full bg-subtle px-2.5 text-sm font-medium not-italic">{pending}</span>{expired ? <span className="rounded-full bg-warning-soft px-2.5 text-sm font-medium not-italic text-warning">{expired} expired</span> : null}</h2>
        {invites.length ? (
          <div className="ml-auto flex gap-1 rounded-full bg-subtle p-1">
            <IconButton icon={LayoutGrid} label="Cards view" variant={view === "cards" ? "filled" : "plain"} size={32} onClick={() => setView("cards")} />
            <IconButton icon={List} label="Table view" variant={view === "table" ? "filled" : "plain"} size={32} onClick={() => setView("table")} />
          </div>
        ) : null}
      </div>

      {invites.length === 0 ? (
        <div className="bg-card" style={{ borderRadius: "var(--card-radius)" }}><EmptyState icon={MailCheck} title="No pending invites" text="Everyone you invited has joined." action={<InviteButton role={viewer.role} />} /></div>
      ) : view === "table" ? (
        <div className="bg-card p-5" style={{ borderRadius: "var(--card-radius)" }}><DataTable columns={columns} rows={invites} /></div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {invites.map((inv) => (
            <li key={inv.id} className={cn("flex flex-col gap-3 bg-card p-5", inv.expired ? "border-2 border-dashed border-warning" : "border-2 border-dashed border-line")} style={{ borderRadius: "24px" }}>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" aria-label={`Select ${inv.email}`} checked={c.selected.includes(inv.membershipId)} onChange={() => c.toggle(inv.membershipId)} className="size-4 accent-[var(--accent)]" />{inv.role === "CLIENT" ? "Client" : "Team"}</label>
                {inv.expired ? <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">Expired</span> : <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-on-accent-soft">Invited</span>}
              </div>
              <PersonCell inv={inv} size={48} />
              <p className="text-sm text-text"><RoleChip role={inv.role} /> · invited by {inv.invitedByName}</p>
              <AppIconRow apps={inv.apps} />
              <p className="text-sm text-muted">Sent {sentText(inv)} · {inv.expired ? expiryText(inv, timezone) : `expires ${expiryText(inv, timezone)}`}</p>
              <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
                <ResendButton inv={inv} onResend={c.resend} busy={c.busy} variant={inv.expired ? "primary" : "secondary"} />
                <InviteMenu inv={inv} onCopy={c.copyLink} onRevoke={c.askRevoke} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {c.dialogs}
    </div>
  );
}
