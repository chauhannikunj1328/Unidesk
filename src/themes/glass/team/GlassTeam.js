"use client";
import { useMemo, useState } from "react";
import { Search, UserSearch } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/components/ui/cn";
import { roleLabel } from "@/lib/labels";
import { filterMembers } from "@/features/team/filters";
import { canOpenMember } from "@/features/team/permissions";
import { useDebouncedQuery, useTeamParams } from "@/features/team/ui/use-team-params";
import { appCount } from "@/features/team/ui/bits";
import { MemberEditor } from "@/features/team/ui/MemberEditor";
import { BulkBar } from "@/features/team/ui/BulkBar";

const CHIPS = [
  { id: "all", label: "All", patch: { role: null, status: null, group: null } },
  { id: "admins", label: "Admins", patch: { role: null, status: null, group: "admins" } },
  { id: "staff", label: "Staff", patch: { role: null, status: null, group: "staff" } },
  { id: "clients", label: "Clients", patch: { role: "client", status: null, group: null } },
  { id: "invited", label: "Invited", patch: { role: null, status: "invited", group: null } },
];

function activeChip(p) {
  if (p.status === "invited") return "invited";
  if (p.role === "client") return "clients";
  if (p.group === "admins") return "admins";
  if (p.group === "staff") return "staff";
  return "all";
}

/**
 * Glass: split view (P2). List on the left, the selected person's panel on the right.
 * App access is edited inside the panel; "Select" turns on bulk editing.
 */
export function GlassTeam({ data, viewer }) {
  const { members, seats, appUsage, timezone } = data;
  const { params, set } = useTeamParams();
  const [q, setQ] = useDebouncedQuery(params.q, (v) => set({ q: v }));
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState([]);
  const canBulk = ["OWNER", "ADMIN"].includes(viewer.role);

  const filtered = useMemo(() => filterMembers(members, { role: params.role, status: params.status, group: params.group, q: params.q }), [members, params.role, params.status, params.group, params.q]);
  const current = members.find((m) => m.id === params.id) ?? filtered.find((m) => canOpenMember(viewer, m)) ?? null;
  const chip = activeChip(params);

  return (
    <div>
      {selectMode && selected.length ? <BulkBar selected={selected} members={members} appUsage={appUsage} seatLimit={seats.limit} onClear={() => { setSelected([]); setSelectMode(false); }} /> : null}
      <div className="grid grid-cols-[380px_minmax(0,1fr)] items-start gap-6 max-[1100px]:grid-cols-1">
        <section aria-label="People" className="bg-card p-5" style={{ borderRadius: "var(--card-radius)", border: "var(--card-border)" }}>
          <label className="relative block">
            <span className="sr-only">Find a person</span>
            <Search size={16} strokeWidth={1.75} aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a person" className="h-11 w-full rounded-[var(--control-radius)] bg-subtle pl-10 pr-3 text-ink outline-none placeholder:text-muted" />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {CHIPS.map((c) => (
              <button key={c.id} type="button" aria-pressed={chip === c.id} onClick={() => set({ ...c.patch, id: null })} className={cn("h-8 rounded-full border px-3.5 text-[13px] font-medium transition-colors", chip === c.id ? "border-transparent bg-primary text-on-primary" : "border-line bg-card text-text hover:bg-subtle")}>{c.label}</button>
            ))}
            {canBulk ? <button type="button" onClick={() => { setSelectMode((s) => !s); setSelected([]); }} className="ml-auto text-[13px] font-medium text-ink underline-offset-2 hover:underline">{selectMode ? "Cancel" : "Select"}</button> : null}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={UserSearch} title="No people match these filters" action={<Button size="sm" onClick={() => { setQ(""); set({ role: null, status: null, group: null, q: null }); }}>Clear filters</Button>} />
          ) : (
            <ul className="mt-3 flex flex-col gap-1">
              {filtered.map((m) => {
                const openable = canOpenMember(viewer, m);
                const isCurrent = current?.id === m.id;
                const checked = selected.includes(m.id);
                return (
                  <li key={m.id} className="flex items-center gap-2">
                    {selectMode ? <input type="checkbox" aria-label={`Select ${m.name}`} checked={checked} onChange={() => setSelected((s) => (checked ? s.filter((x) => x !== m.id) : [...s, m.id]))} className="size-4 accent-[var(--accent)]" /> : null}
                    <button type="button" disabled={!openable} aria-current={isCurrent ? "true" : undefined} onClick={() => set({ id: m.id })} className={cn("flex min-w-0 flex-1 items-center gap-3 rounded-[16px] border px-3 py-3 text-left transition-colors", isCurrent ? "border-[color:var(--accent)]/35 bg-accent-soft" : "border-transparent hover:bg-subtle", !openable && "cursor-default hover:bg-transparent")}>
                      <Avatar name={m.name} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">{m.name}</span>
                        <span className="block truncate text-sm text-muted">{roleLabel(m.role)}{m.role === "CLIENT" ? "" : ""} · {appCount(m)}</span>
                      </span>
                      {m.status === "invited" ? <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">Invited</span> : m.status === "active" ? <span aria-label="Active" className="size-2.5 rounded-full bg-success" /> : <span className="rounded-full bg-subtle px-2.5 py-1 text-xs text-muted">Inactive</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-label="Person" className="bg-card p-8" style={{ borderRadius: "var(--card-radius)", border: "var(--card-border)" }}>
          {current ? <MemberEditor key={current.id} member={current} members={members} viewer={viewer} timezone={timezone} anchorAccess="access" /> : (
            <EmptyState icon={UserSearch} title="Select a person" text="Choose someone from the list to see their role, apps and recent activity." />
          )}
        </section>
      </div>
    </div>
  );
}
