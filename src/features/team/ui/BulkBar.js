"use client";
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Menu } from "@/components/ui/Menu";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { APP_LIST, CLIENT_APPS } from "@/lib/apps";
import { roleLabel } from "@/lib/labels";
import { ROLES } from "../constants";
import { bulkChangeAction } from "../actions";

/**
 * Appears only with a selection. Gives or removes an app, changes role or manager for everyone selected.
 * Each change confirms with the count and seat use, then writes one audit event per person.
 */
export function BulkBar({ selected, members, appUsage, seatLimit, onClear, tone = "dark" }) {
  const toast = useToast();
  const [pending, setPending] = useState(null); // { change, title, consequence }
  const [busy, startBusy] = useTransition();
  const people = selected.map((id) => members.find((m) => m.id === id)).filter(Boolean);
  const names = people.map((p) => p.name).join(", ");

  function askAccess(app, enabled) {
    const label = APP_LIST.find((a) => a.code === app).label;
    const affected = people.filter((p) => p.role !== "OWNER" && p.apps.includes(app) !== enabled);
    const clientBlocked = people.filter((p) => p.role === "CLIENT" && !CLIENT_APPS.includes(app));
    if (affected.length === 0) { toast({ message: enabled ? `Everyone selected already has ${label}.` : `Nobody selected has ${label}.` }); return; }
    const newSeats = enabled ? affected.filter((p) => p.role !== "CLIENT" && !clientBlocked.includes(p)).length : 0;
    const free = seatLimit - (appUsage[app] ?? 0);
    setPending({
      change: { type: "access", app, enabled },
      title: enabled ? `Give ${label} access to ${affected.length} ${affected.length === 1 ? "person" : "people"}?` : `Remove ${label} access from ${affected.length} ${affected.length === 1 ? "person" : "people"}?`,
      consequence: enabled ? `Uses ${newSeats} more ${label} ${newSeats === 1 ? "seat" : "seats"}. ${free} ${free === 1 ? "seat is" : "seats are"} free now.` : "They are signed out of the app straight away.",
    });
  }
  const askRole = (role) => setPending({ change: { type: "role", role }, title: `Change ${people.length} ${people.length === 1 ? "person's" : "people's"} role to ${roleLabel(role)}?`, consequence: "People who are Owner or already have this role are skipped." });
  const askManager = (m) => setPending({ change: { type: "manager", reportsToId: m.id }, title: `Make ${m.name} the manager of ${people.length} ${people.length === 1 ? "person" : "people"}?`, consequence: "Anyone who would create a reporting loop is skipped." });

  function confirm() {
    const { change } = pending;
    setPending(null);
    startBusy(async () => {
      const r = await bulkChangeAction({ membershipIds: selected, change });
      if (!r.ok && !r.results) { toast({ kind: "error", message: r.error }); return; }
      const changed = r.results.filter((x) => x.ok && x.changed).length;
      toast({ kind: r.failed ? "info" : "success", message: r.failed ? `${changed} changed, ${r.failed} skipped.` : `${changed} ${changed === 1 ? "person" : "people"} updated.` });
      onClear();
    });
  }

  const trigger = (label) => {
    const Trigger = ({ toggle }) => (
      <button type="button" onClick={toggle} disabled={busy} className="h-10 rounded-full bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50">{label} ▾</button>
    );
    return Trigger;
  };
  const managers = members.filter((m) => m.role !== "CLIENT" && m.status === "active");
  const bg = tone === "green" ? "#14260b" : "#111";

  return (
    <div role="region" aria-label="Bulk actions" className="mb-4 flex flex-wrap items-center gap-3 rounded-full px-4 py-2.5 text-white" style={{ background: bg }}>
      <span className="inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold text-black" style={{ background: tone === "green" ? "#a6c64a" : "#f2dc1f" }}>{people.length}</span>
      <span className="min-w-0 flex-1 truncate">{people.length === 1 ? "person" : "people"} selected: {names}</span>
      <Menu align="left" trigger={trigger("Give access to")} items={APP_LIST.map((a) => ({ label: a.label, onSelect: () => askAccess(a.code, true) }))} />
      <Menu align="left" trigger={trigger("Remove access")} items={APP_LIST.map((a) => ({ label: a.label, onSelect: () => askAccess(a.code, false) }))} />
      <Menu align="left" trigger={trigger("Change role")} items={ROLES.filter((r) => r !== "OWNER" && r !== "CLIENT").map((r) => ({ label: roleLabel(r), onSelect: () => askRole(r) }))} />
      <Menu align="left" trigger={trigger("Change manager")} items={managers.map((m) => ({ label: m.name, onSelect: () => askManager(m) }))} />
      <button type="button" onClick={onClear} aria-label="Clear selection" className="inline-flex size-9 items-center justify-center rounded-full bg-white text-black"><X size={16} strokeWidth={1.75} aria-hidden /></button>
      <ConfirmDialog open={!!pending} onClose={() => setPending(null)} onConfirm={confirm} title={pending?.title ?? ""} consequence={pending?.consequence ?? ""} confirmLabel="Confirm" loading={busy} />
    </div>
  );
}
