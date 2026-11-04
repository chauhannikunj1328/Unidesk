"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Lock, Mail } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusChip } from "@/components/ui/StatusChip";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import { APP_LIST, CLIENT_APPS } from "@/lib/apps";
import { roleLabel } from "@/lib/labels";
import { formatDate, formatRelative, daysAgo } from "@/lib/dates";
import { ROLES, ROLE_HELP, POWER_RANK } from "../constants";
import { descendantIds } from "../filters";
import { canEditMember, canEditRoles } from "../permissions";
import { setAppAccessAction, setManagerAction, setRoleAction } from "../actions";

/**
 * Role, Reports to, App access and Recent activity for one person, with auto-save (06-team-member-detail.md).
 * The same editor sits inside the glass panel and the pastel and grove drawers.
 */
export function MemberEditor({ member, members, viewer, timezone, onDone, sections = ["role", "access", "activity"], anchorAccess }) {
  const toast = useToast();
  const [apps, setApps] = useState(member.apps);
  const [role, setRole] = useState(member.role);
  const [reportsTo, setReportsTo] = useState(member.reportsToId ?? "");
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState(true);
  const [confirmRole, setConfirmRole] = useState(null);

  useEffect(() => { setApps(member.apps); setRole(member.role); setReportsTo(member.reportsToId ?? ""); }, [member]);

  const editable = canEditMember(viewer, member);
  const rolesEditable = canEditRoles(viewer) && member.role !== "OWNER";
  const isOwner = member.role === "OWNER";
  const first = member.name.split(" ")[0];
  const blocked = useMemo(() => descendantIds(members, member.id), [members, member.id]);
  const managerOptions = members.filter((m) => m.id !== member.id && !blocked.has(m.id) && m.role !== "CLIENT" && m.status !== "inactive");

  function track(promise) {
    setSaved(false);
    startSaving(async () => { await promise; setSaved(true); });
  }

  async function toggleApp(code, enabled, { silent } = {}) {
    const before = apps;
    setApps(enabled ? [...apps, code] : apps.filter((a) => a !== code));
    const r = await setAppAccessAction({ membershipId: member.id, app: code, enabled });
    if (!r.ok) {
      setApps(before);
      toast({ kind: "error", message: r.error });
      return;
    }
    if (!silent && r.changed) {
      const label = APP_LIST.find((a) => a.code === code).label;
      toast({
        kind: "success",
        message: enabled ? `${label} access given to ${member.name}` : `${label} access removed from ${member.name}`,
        onUndo: () => toggleApp(code, !enabled, { silent: true }),
      });
    }
  }

  async function applyRole(next) {
    const before = role;
    setRole(next);
    const r = await setRoleAction({ membershipId: member.id, role: next });
    if (!r.ok) { setRole(before); toast({ kind: "error", message: r.error }); return; }
    toast({ kind: "success", message: `${member.name} is now ${roleLabel(next)}`, onUndo: () => setRoleAction({ membershipId: member.id, role: before }) });
  }

  function pickRole(next) {
    if (next === role) return;
    if (POWER_RANK[next] > POWER_RANK[role]) setConfirmRole(next);
    else track(applyRole(next));
  }

  async function applyManager(id) {
    const before = reportsTo;
    setReportsTo(id);
    const r = await setManagerAction({ membershipId: member.id, reportsToId: id });
    if (!r.ok) { setReportsTo(before); toast({ kind: "error", message: r.error }); }
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-start gap-4">
        <Avatar name={member.name} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display-theme truncate text-[32px] leading-tight">{member.name}</h2>
            <StatusChip status={member.status} />
          </div>
          <p className="mt-1 text-muted">
            {member.email}
            {member.status === "invited" && member.invitedAt ? ` · Invited ${daysAgo(member.invitedAt, new Date(), timezone)}` : member.joinedAt ? ` · Joined ${formatDate(member.joinedAt, timezone)}` : ""}
            {member.status === "active" && member.lastActiveAt ? ` · Active ${formatRelative(member.lastActiveAt, new Date(), timezone).toLowerCase()}` : ""}
          </p>
        </div>
        <a href={`mailto:${member.email}`}><Button size="sm" icon={Mail}>Send message</Button></a>
      </div>

      {sections.includes("role") ? (
        <section aria-labelledby="role-h">
          <div className="mb-3 flex items-baseline justify-between"><h3 id="role-h" className="font-display-theme text-[22px]">Role</h3><span className="text-sm text-muted">Who can do what</span></div>
          <div role="radiogroup" aria-label="Role" className="grid grid-cols-3 gap-1 rounded-[var(--control-radius)] bg-subtle p-1 sm:grid-cols-6">
            {ROLES.map((r) => {
              const disabled = !rolesEditable || r === "OWNER" || r === "CLIENT";
              const reason = r === "OWNER" ? "Only one owner. Transfer ownership in Settings." : r === "CLIENT" ? "Changing someone to Client arrives with the client portal." : !rolesEditable ? "Only admins can change this." : undefined;
              const active = role === r;
              return (
                <button key={r} type="button" role="radio" aria-checked={active} disabled={disabled && !active} title={reason} onClick={() => !disabled && pickRole(r)} className={cn("h-10 rounded-[var(--control-radius)] px-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed", active ? "bg-card text-ink shadow-sm" : "text-text hover:text-ink", disabled && !active && "opacity-45")} style={active ? { background: `var(--role-${r.toLowerCase()}, var(--card))` } : undefined}>
                  {roleLabel(r)}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-text">{ROLE_HELP[role]}</p>
          {!rolesEditable ? <p className="mt-2 flex items-center gap-1.5 text-sm text-muted"><Lock size={14} strokeWidth={1.75} aria-hidden />{isOwner ? "The owner's role can't be changed here." : "Only admins can change this."}</p> : null}
          {!isOwner ? (
            <div className="mt-4 max-w-xs">
              <Select label="Reports to" value={reportsTo} disabled={!rolesEditable} onChange={(e) => track(applyManager(e.target.value))} options={[{ value: "", label: "Choose a person" }, ...managerOptions.map((m) => ({ value: m.id, label: m.name }))]} />
            </div>
          ) : null}
        </section>
      ) : null}

      {sections.includes("access") ? (
        <section id={anchorAccess} aria-labelledby="access-h" className="scroll-mt-6">
          <div className="mb-3 flex items-baseline justify-between"><h3 id="access-h" className="font-display-theme text-[22px]">App access</h3><span className="text-sm text-muted">{isOwner ? "All 7 apps" : `${apps.length} of 7 apps`}</span></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {APP_LIST.map((a) => {
              const on = isOwner || apps.includes(a.code);
              const notForClient = member.role === "CLIENT" && !CLIENT_APPS.includes(a.code);
              const locked = isOwner || notForClient || !editable;
              return (
                <div key={a.code} className={cn("flex items-center gap-3 rounded-[16px] border p-4", on ? "border-transparent bg-accent-soft" : "border-line bg-card")}>
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: a.dot }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{a.label}</p>
                    <p className="truncate text-sm text-muted">{notForClient ? "Not available to clients" : a.description}</p>
                  </div>
                  {locked ? <Lock size={14} strokeWidth={1.75} aria-hidden className="text-muted" /> : null}
                  <Toggle checked={on} disabled={locked} label={`${a.label} access for ${member.name}`} onChange={(v) => track(toggleApp(a.code, v))} />
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-muted">{isOwner ? "The owner always has every app." : `Turning an app off signs ${first} out of it straight away.`}</p>
        </section>
      ) : null}

      {sections.includes("activity") ? (
        <section aria-labelledby="act-h">
          <div className="mb-3 flex items-baseline justify-between"><h3 id="act-h" className="font-display-theme text-[22px]">Recent activity</h3><span className="text-sm text-muted">From the audit log</span></div>
          {member.activity.length === 0 ? <p className="text-muted">No activity yet.</p> : (
            <ul className="flex flex-col gap-2.5">
              {member.activity.map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: APP_LIST.find((a) => a.code.toLowerCase() === e.app)?.dot ?? "var(--ink)" }} />
                  <span className="flex-1 text-ink">{e.summary}</span>
                  <span className="text-sm text-muted">{formatRelative(e.at, new Date(), timezone)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <div className="flex items-center justify-end gap-4 border-t border-line pt-4">
        <span className="text-sm text-muted" aria-live="polite">{saving || !saved ? "Saving…" : "All changes saved"}</span>
        {onDone ? <Button variant="primary" onClick={onDone}>Done</Button> : null}
      </div>

      <ConfirmDialog
        open={!!confirmRole}
        onClose={() => setConfirmRole(null)}
        onConfirm={() => { const next = confirmRole; setConfirmRole(null); track(applyRole(next)); }}
        title={`Change ${first}'s role to ${confirmRole ? roleLabel(confirmRole) : ""}?`}
        consequence={`${first} will have fewer powers than ${roleLabel(role)}s do. You can change it back at any time.`}
        confirmLabel="Change role"
      />
    </div>
  );
}
