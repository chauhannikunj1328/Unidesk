"use client";
import { MailCheck } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { InviteButton } from "@/features/team/ui/InviteDrawer";
import { AppChips, RoleChip } from "@/features/team/ui/bits";
import { InviteBulkBar, InviteMenu, PersonCell, ResendButton, expiryText, sentText, useInvitesController } from "@/features/team/ui/invites-shared";

/** Pastel: the pill-header table with a checkbox on every row and the black bulk bar. */
export function PastelInvites({ data, viewer }) {
  const { invites, pending, expired, timezone } = data;
  const c = useInvitesController(invites);
  const all = invites.length > 0 && c.selected.length === invites.length;

  const columns = [
    { key: "select", header: <input type="checkbox" aria-label="Select all invites" checked={all} onChange={(e) => c.setAll(e.target.checked)} className="size-4 accent-[var(--accent)]" />, render: (i) => <input type="checkbox" aria-label={`Select ${i.email}`} checked={c.selected.includes(i.membershipId)} onChange={() => c.toggle(i.membershipId)} className="size-4 accent-[var(--accent)]" /> },
    { key: "person", header: "Person", render: (i) => <PersonCell inv={i} /> },
    { key: "role", header: "Role", render: (i) => <RoleChip role={i.role} /> },
    { key: "apps", header: "Apps", render: (i) => <AppChips apps={i.apps} role={i.role} /> },
    { key: "by", header: "Invited by", render: (i) => i.invitedByName },
    { key: "sent", header: "Sent", render: (i) => <span className="text-muted">{sentText(i)}</span> },
    { key: "expires", header: "Expires", render: (i) => (i.expired ? <span className="inline-flex h-7 items-center rounded-full bg-warning-soft px-3 text-[13px] font-medium text-warning">Expired</span> : <span className="text-muted">{expiryText(i, timezone)}</span>) },
    { key: "actions", header: <span className="sr-only">Actions</span>, align: "right", render: (i) => (
      <span className="inline-flex items-center gap-2"><ResendButton inv={i} onResend={c.resend} busy={c.busy} variant={i.expired ? "primary" : "secondary"} /><InviteMenu inv={i} onCopy={c.copyLink} onRevoke={c.askRevoke} /></span>
    ) },
  ];

  return (
    <div>
      {c.selected.length ? <InviteBulkBar count={c.selected.length} busy={c.busy} onResend={() => c.resend(c.selected)} onRevoke={() => c.askRevoke(c.selected)} onClear={c.clear} /> : null}
      <section aria-label="Pending invites" className="bg-card p-5" style={{ borderRadius: "var(--card-radius)" }}>
        <h2 className="font-display-theme mb-4 flex items-center gap-2 text-[24px]">Pending invites <span className="tabular rounded-full bg-subtle px-2.5 text-sm font-medium">{pending}</span>{expired ? <span className="rounded-full bg-warning-soft px-2.5 text-sm font-medium text-warning">{expired} expired</span> : null}</h2>
        <DataTable columns={columns} rows={invites} empty={<EmptyState icon={MailCheck} title="No pending invites" text="Everyone you invited has joined." action={<InviteButton role={viewer.role} />} />} />
      </section>
      {c.dialogs}
    </div>
  );
}
