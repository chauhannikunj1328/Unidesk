"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, Minus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import { APP_LIST, CLIENT_APPS } from "@/lib/apps";
import { daysAgo } from "@/lib/dates";
import { canEditMember } from "../permissions";
import { setAppAccessAction } from "../actions";
import { RoleChip } from "./bits";
import { BulkBar } from "./BulkBar";

/** One circle per person per app. Filled = has access, dashed = none, dark = always on. */
function Circle({ state, role, label, onClick }) {
  if (state === "na") return <span title="Not available to clients" className="inline-flex size-9 items-center justify-center text-muted"><Minus size={14} aria-hidden /><span className="sr-only">{label}: not available to clients</span></span>;
  const on = state === "on" || state === "always" || state === "locked-on";
  const fill = state === "always" ? "#111" : on ? `var(--role-${role.toLowerCase()}, var(--accent-soft))` : "transparent";
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={state === "always" || state === "locked" || state === "locked-on"} onClick={onClick} className={cn("inline-flex size-9 items-center justify-center rounded-full border transition-colors", on ? "border-transparent" : "border-dashed border-muted/60 hover:bg-subtle", (state === "locked" || state === "locked-on") && "opacity-60")} style={{ background: fill, color: state === "always" ? "#fff" : "var(--ink)" }}>
      {on ? <Check size={16} strokeWidth={2} aria-hidden /> : null}
    </button>
  );
}

/**
 * Who can open which app, for everyone at once (07-team-app-access-matrix.md).
 * variant "circles" (pastel) or "toggles" (grove). Edits save instantly with Undo.
 */
export function AccessGrid({ members, viewer, timezone, appUsage, seatLimit, variant = "circles", barTone = "dark" }) {
  const toast = useToast();
  const [map, setMap] = useState(() => Object.fromEntries(members.map((m) => [m.id, m.apps])));
  const [selected, setSelected] = useState([]);
  const [last, setLast] = useState(null);
  const sig = members.map((m) => m.id + m.apps.join()).join("|");
  useEffect(() => setMap(Object.fromEntries(members.map((m) => [m.id, m.apps]))), [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => Object.fromEntries(APP_LIST.map((a) => [a.code, members.filter((m) => (m.role === "OWNER" ? true : (map[m.id] ?? []).includes(a.code)) && m.role !== "CLIENT").length + members.filter((m) => m.role === "CLIENT" && (map[m.id] ?? []).includes(a.code)).length])), [members, map]);

  async function toggle(m, app, enabled, { silent } = {}) {
    const before = map[m.id];
    setMap((x) => ({ ...x, [m.id]: enabled ? [...before, app] : before.filter((a) => a !== app) }));
    const r = await setAppAccessAction({ membershipId: m.id, app, enabled });
    if (!r.ok) { setMap((x) => ({ ...x, [m.id]: before })); toast({ kind: "error", message: r.error.startsWith("No free seat") ? `${r.error} Ask an owner to add a seat.` : `Couldn't change access for ${m.name}. ${r.error}` }); return; }
    if (!silent && r.changed) {
      setLast({ m, app, enabled });
      const label = APP_LIST.find((a) => a.code === app).label;
      toast({ kind: "success", message: enabled ? `${label} access given to ${m.name}` : `${label} access removed from ${m.name}`, onUndo: () => toggle(m, app, !enabled, { silent: true }) });
    }
  }

  const allIds = members.map((m) => m.id);
  const allSelected = selected.length === allIds.length && allIds.length > 0;
  const live = (id) => members.map((m) => (m.id === id ? { ...m, apps: map[id] ?? m.apps } : m)).find((m) => m.id === id);

  return (
    <div>
      {selected.length ? <BulkBar selected={selected} members={members.map((m) => ({ ...m, apps: map[m.id] ?? m.apps }))} appUsage={appUsage} seatLimit={seatLimit} onClear={() => setSelected([])} tone={barTone} /> : null}
      <div className="rounded-[var(--card-radius)] bg-card p-5" style={{ border: "var(--card-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className="w-10 px-3 py-3"><input type="checkbox" aria-label="Select everyone" checked={allSelected} onChange={() => setSelected(allSelected ? [] : allIds)} className="size-4 accent-[var(--accent)]" /></th>
                <th className="sticky left-0 bg-card px-3 py-3 text-xs font-medium text-muted">Person</th>
                <th className="px-3 py-3 text-xs font-medium text-muted">Role</th>
                {APP_LIST.map((a) => (
                  <th key={a.code} className="px-2 py-3 text-center text-xs font-medium text-ink">
                    <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full" style={{ background: a.dot }} />{a.label}</span>
                    <span className="block font-normal text-muted">{counts[a.code]} {counts[a.code] === 1 ? "person" : "people"}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const mine = map[m.id] ?? m.apps;
                const editable = canEditMember(viewer, m);
                const isSel = selected.includes(m.id);
                return (
                  <tr key={m.id} className={cn(isSel && "bg-accent-soft")}>
                    <td className="border-t border-line px-3"><input type="checkbox" aria-label={`Select ${m.name}`} checked={isSel} onChange={() => setSelected((s) => (isSel ? s.filter((x) => x !== m.id) : [...s, m.id]))} className="size-4 accent-[var(--accent)]" /></td>
                    <td className={cn("sticky left-0 border-t border-line px-3 py-3", isSel ? "bg-accent-soft" : "bg-card")}>
                      <span className="flex items-center gap-3"><Avatar name={m.name} size={36} /><span><span className="block font-medium text-ink">{m.name}</span>
                        <span className={cn("block text-sm", m.status === "invited" ? "text-warning" : "text-muted")}>{m.status === "invited" ? `Invite sent ${m.invitedAt ? daysAgo(m.invitedAt, new Date(), timezone) : ""}` : m.role === "OWNER" ? "Workspace owner" : m.reportsToName ? `Reports to ${m.reportsToName}` : ""}</span></span></span>
                    </td>
                    <td className="border-t border-line px-3"><RoleChip role={m.role} /></td>
                    {APP_LIST.map((a) => {
                      const na = m.role === "CLIENT" && !CLIENT_APPS.includes(a.code);
                      const on = m.role === "OWNER" || mine.includes(a.code);
                      const label = `${a.label} access for ${m.name}`;
                      return (
                        <td key={a.code} className="border-t border-line px-2 py-2 text-center">
                          {variant === "toggles" ? (
                            na ? <span title="Not available to clients" className="text-muted">—</span> : <Toggle checked={on} disabled={m.role === "OWNER" || !editable} label={label} onChange={(v) => toggle(live(m.id), a.code, v)} />
                          ) : (
                            <Circle state={na ? "na" : m.role === "OWNER" ? "always" : !editable ? (on ? "locked-on" : "locked") : on ? "on" : "off"} role={m.role} label={label} onClick={() => toggle(live(m.id), a.code, !on)} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-muted">
          <span>Every change is saved right away and recorded in the audit log.</span>
          <Button size="sm" disabled={!last} onClick={() => { const l = last; setLast(null); toggle(l.m, l.app, !l.enabled, { silent: true }); }}>Undo last change</Button>
        </div>
      </div>
    </div>
  );
}
