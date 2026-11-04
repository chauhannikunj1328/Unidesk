"use client";
import { useMemo } from "react";
import { UserSearch } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Field";
import { SegmentedTabs } from "@/components/ui/Tabs";
import { cn } from "@/components/ui/cn";
import { roleLabel } from "@/lib/labels";
import { filterMembers, roleCounts, statusCounts } from "@/features/team/filters";
import { canOpenMember } from "@/features/team/permissions";
import { ROLES } from "@/features/team/constants";
import { useDebouncedQuery, useTeamParams } from "@/features/team/ui/use-team-params";
import { PeopleTable } from "@/features/team/ui/PeopleTable";
import { MemberEditor } from "@/features/team/ui/MemberEditor";

/**
 * Pastel People: role-coloured tiles that filter, a "Seats left" tile, then the members table.
 * A person opens in a drawer. Bulk access work happens on the App access tab (the matrix).
 */
export function PastelTeam({ data, viewer }) {
  const { members, seats, timezone } = data;
  const { params, set } = useTeamParams();
  const [q, setQ] = useDebouncedQuery(params.q, (v) => set({ q: v }));
  const counts = roleCounts(members);
  const statuses = statusCounts(members);
  const filtered = useMemo(() => filterMembers(members, { role: params.role, status: params.status, q: params.q, manager: params.manager }), [members, params.role, params.status, params.q, params.manager]);
  const open = members.find((m) => m.id === params.id && canOpenMember(viewer, m));
  const managers = members.filter((m) => members.some((x) => x.reportsToId === m.id));

  const tiles = [{ key: null, label: "All people", n: counts.all }, ...ROLES.map((r) => ({ key: r.toLowerCase(), label: roleLabel(r), n: counts[r] ?? 0, role: r }))];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-3 min-[1200px]:grid-cols-8 max-[700px]:grid-cols-2">
        {tiles.map((t) => {
          const active = (params.role ?? null) === t.key;
          return (
            <button key={t.label} type="button" aria-pressed={active} onClick={() => set({ role: active ? null : t.key, id: null })} className={cn("rounded-[22px] p-4 text-left transition-transform hover:-translate-y-0.5", active && "ring-2 ring-ink")} style={{ background: t.key === null ? (active ? "#111" : "#fff") : `var(--role-${t.key}, #e9e8e4)`, color: t.key === null && active ? "#fff" : "var(--ink)" }}>
              <span className="tabular block text-[32px] leading-none">{t.n}</span>
              <span className="mt-2 block text-sm">{t.label}</span>
            </button>
          );
        })}
        <div className="rounded-[22px] bg-primary p-4 text-on-primary">
          <span className="tabular block text-[32px] leading-none">{seats.left}</span>
          <span className="mt-2 block text-sm">Seats left</span>
        </div>
      </div>

      <section aria-label="Members" className="bg-card p-5" style={{ borderRadius: "var(--card-radius)" }}>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <h2 className="font-display-theme mr-2 flex items-center gap-2 text-[24px]">Members <span className="tabular rounded-full bg-subtle px-2.5 text-sm font-medium">{members.length}</span></h2>
          <label className="min-w-[220px] flex-1"><span className="sr-only">Search by name or email</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="h-10 w-full rounded-full border border-line bg-input px-4 text-ink outline-none placeholder:text-muted" /></label>
          <div className="w-40"><Select label="Role" value={params.role ?? ""} onChange={(e) => set({ role: e.target.value || null, id: null })} options={[{ value: "", label: "All roles" }, ...ROLES.map((r) => ({ value: r.toLowerCase(), label: roleLabel(r) }))]} /></div>
          <div className="w-44"><Select label="Manager" value={params.manager ?? ""} onChange={(e) => set({ manager: e.target.value || null })} options={[{ value: "", label: "All managers" }, ...managers.map((m) => ({ value: m.id, label: m.name }))]} /></div>
          <SegmentedTabs label="Status" value={params.status ?? "all"} onChange={(v) => set({ status: v === "all" ? null : v })} items={[{ value: "all", label: "All", count: statuses.all }, { value: "active", label: "Active", count: statuses.active ?? 0 }, { value: "invited", label: "Invited", count: statuses.invited ?? 0 }, ...(statuses.inactive ? [{ value: "inactive", label: "Inactive", count: statuses.inactive }] : [])]} />
        </div>
        <PeopleTable members={filtered} viewer={viewer} timezone={timezone} onOpen={(m) => canOpenMember(viewer, m) && set({ id: m.id })} empty={<EmptyState icon={UserSearch} title="No people match these filters" action={<Button size="sm" onClick={() => { setQ(""); set({ role: null, status: null, q: null, manager: null }); }}>Clear filters</Button>} />} />
        <p className="mt-3 text-sm text-muted">Showing {filtered.length} of {members.length} people</p>
      </section>

      <Drawer open={!!open} onClose={() => set({ id: null })} title="Person details">
        {open ? <MemberEditor key={open.id} member={open} members={members} viewer={viewer} timezone={timezone} onDone={() => set({ id: null })} /> : null}
      </Drawer>
    </div>
  );
}
