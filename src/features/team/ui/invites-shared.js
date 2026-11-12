"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Ellipsis, Send, UserCog, Ban, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { Menu } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/dates";
import { copyInviteLinkAction, resendInvitesAction, revokeInvitesAction } from "../invite-actions";

const DAY = 24 * 3600 * 1000;

/** "in 5 days", "tomorrow", "today", or "Expired 3 Nov 2026". */
export function expiryText(inv, timezone, now = Date.now()) {
  if (inv.expired) return `Expired ${formatDate(inv.expiresAt, timezone)}`;
  const days = Math.ceil((new Date(inv.expiresAt).getTime() - now) / DAY);
  return days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
}

/** "today", "yesterday", "3 days ago". */
export function sentText(inv, now = Date.now()) {
  const days = Math.floor((now - new Date(inv.sentAt).getTime()) / DAY);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

/** Minutes until an invite may be sent again, or 0. */
export const minutesToResend = (inv, now = Date.now()) => (inv.resendAt ? Math.max(Math.ceil((new Date(inv.resendAt).getTime() - now) / 60000), 0) : 0);

/**
 * All the doing for the Invites tab, shared by every theme: selection, resend, revoke with a confirmation, and copying
 * a link. Returns what the screens need plus `dialogs`, which each screen renders once.
 */
export function useInvitesController(invites) {
  const toast = useToast();
  const [selected, setSelected] = useState([]);
  const [ask, setAsk] = useState(null); // { ids, emails }
  const [linkShown, setLinkShown] = useState(null);
  const [busy, startBusy] = useTransition();
  const byMembership = useMemo(() => new Map(invites.map((i) => [i.membershipId, i])), [invites]);
  const live = selected.filter((id) => byMembership.has(id)); // a row that disappeared drops out of the selection

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const clear = () => setSelected([]);
  const setAll = (on) => setSelected(on ? invites.map((i) => i.membershipId) : []);

  function resend(ids) {
    startBusy(async () => {
      const r = await resendInvitesAction({ membershipIds: ids });
      if (!r.results) { toast({ kind: "error", message: r.error }); return; }
      if (ids.length === 1) {
        const one = r.results[0];
        toast(one.ok ? { kind: "success", message: `Invite sent again to ${one.email}` } : { kind: "error", message: one.error });
      } else {
        const firstError = r.results.find((x) => !x.ok)?.error;
        toast({ kind: r.failed ? "info" : "success", message: `${r.done} sent again${r.failed ? `, ${r.failed} skipped. ${firstError}` : ""}` });
      }
      clear();
    });
  }

  const askRevoke = (ids) => setAsk({ ids, emails: ids.map((id) => byMembership.get(id)?.email).filter(Boolean) });

  function confirmRevoke() {
    const { ids } = ask;
    setAsk(null);
    startBusy(async () => {
      const r = await revokeInvitesAction({ membershipIds: ids });
      if (!r.results) { toast({ kind: "error", message: r.error }); return; }
      toast({ kind: r.failed ? "info" : "success", message: r.failed ? `${r.done} revoked, ${r.failed} skipped` : ids.length === 1 ? `Invite to ${r.results[0].email} revoked` : `${r.done} invites revoked` });
      clear();
    });
  }

  function copyLink(inv) {
    startBusy(async () => {
      const r = await copyInviteLinkAction({ membershipId: inv.membershipId });
      if (!r.ok) { toast({ kind: "error", message: r.error }); return; }
      try {
        await navigator.clipboard.writeText(r.link);
        toast({ kind: "success", message: "Invite link copied. It replaces the previous link." });
      } catch {
        setLinkShown(r.link); // the browser blocked the clipboard: show it so it can be copied by hand
      }
    });
  }

  const dialogs = (
    <>
      <ConfirmDialog
        open={!!ask}
        onClose={() => setAsk(null)}
        onConfirm={confirmRevoke}
        title={ask?.ids.length === 1 ? `Revoke the invite to ${ask.emails[0]}?` : `Revoke ${ask?.ids.length ?? 0} invites?`}
        consequence="The link will stop working and the seat is free again. The person is removed from your team list."
        confirmLabel="Revoke"
        loading={busy}
      />
      <Dialog open={!!linkShown} onClose={() => setLinkShown(null)} title="Copy the invite link" footer={<Button onClick={() => setLinkShown(null)}>Done</Button>}>
        <p className="mb-3">Your browser did not allow copying. Select and copy the link. It replaces the previous link.</p>
        <input readOnly value={linkShown ?? ""} onFocus={(e) => e.target.select()} aria-label="Invite link" className="h-10 w-full rounded-[var(--control-radius)] border border-line bg-input px-3 text-ink" />
      </Dialog>
    </>
  );

  return { selected: live, toggle, clear, setAll, resend, askRevoke, copyLink, busy, dialogs };
}

/** "Resend" with the wait built in: disabled, with the reason, until the hour is up. */
export function ResendButton({ inv, onResend, busy, size = "sm", variant = "secondary" }) {
  const wait = minutesToResend(inv);
  const label = inv.expired ? "Send new invite" : "Resend";
  return (
    <span title={wait ? `You can resend in ${wait} ${wait === 1 ? "minute" : "minutes"}.` : undefined}>
      <Button size={size} variant={variant} icon={Send} disabled={busy || wait > 0} onClick={() => onResend([inv.membershipId])} aria-label={`${label} to ${inv.email}`}>{label}</Button>
    </span>
  );
}

/** The ⋯ menu: edit, copy link (owners and admins), revoke last. */
export function InviteMenu({ inv, onCopy, onRevoke }) {
  const router = useRouter();
  const items = [
    { label: "Edit role and apps", icon: UserCog, onSelect: () => router.push(`/hub/team?id=${inv.membershipId}`) },
    ...(inv.canCopyLink ? [{ label: "Copy invite link", icon: Copy, onSelect: () => onCopy(inv) }] : []),
    { separator: true },
    { label: "Revoke invite", icon: Ban, danger: true, onSelect: () => onRevoke([inv.membershipId]) },
  ];
  return <Menu items={items} trigger={({ toggle }) => <IconButton icon={Ellipsis} label={`More actions for ${inv.email}`} variant="outline" size={32} onClick={toggle} />} />;
}

/** The person cell: avatar, the email, and the name when we know it. */
export function PersonCell({ inv, size = 36 }) {
  return (
    <span className="flex items-center gap-3">
      <Avatar name={inv.name ?? inv.email} size={size} className="ring-1 ring-line" />
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink">{inv.name ?? inv.email}</span>
        {inv.name ? <span className="block truncate text-sm font-normal text-muted">{inv.email}</span> : null}
      </span>
    </span>
  );
}

/** Dark pill that appears with a selection (same look as the people bulk bar). */
export function InviteBulkBar({ count, onResend, onRevoke, onClear, busy, tone = "dark" }) {
  return (
    <div role="region" aria-label="Bulk actions" className="mb-4 flex flex-wrap items-center gap-3 rounded-full px-4 py-2.5 text-white" style={{ background: tone === "green" ? "#14260b" : "#111" }}>
      <span className="inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold text-black" style={{ background: tone === "green" ? "#a6c64a" : "#f2dc1f" }}>{count}</span>
      <span className="min-w-0 flex-1 truncate">{count === 1 ? "invite" : "invites"} selected</span>
      <button type="button" disabled={busy} onClick={onResend} className="h-10 rounded-full bg-white/10 px-4 text-sm font-medium hover:bg-white/20 disabled:opacity-50">Resend</button>
      <button type="button" disabled={busy} onClick={onRevoke} className="h-10 rounded-full bg-white/10 px-4 text-sm font-medium hover:bg-white/20 disabled:opacity-50">Revoke</button>
      <button type="button" onClick={onClear} aria-label="Clear selection" className="inline-flex size-9 items-center justify-center rounded-full bg-white text-black"><X size={16} strokeWidth={1.75} aria-hidden /></button>
    </div>
  );
}
