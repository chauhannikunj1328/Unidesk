"use client";
import { useMemo, useState } from "react";
import { Armchair, CircleAlert, LayoutGrid, List, Mail, ShieldCheck, UserSearch } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { SegmentedTabs } from "@/components/ui/Tabs";
import { StatusChip } from "@/components/ui/StatusChip";
import { cn } from "@/components/ui/cn";
import { roleLabel, appLabel } from "@/lib/labels";
import { formatRelative, daysAgo } from "@/lib/dates";
import { filterMembers, statusCounts } from "@/features/team/filters";
import { canEditMember, canOpenMember } from "@/features/team/permissions";
import { ROLES } from "@/features/team/constants";
import { useDebouncedQuery, useTeamParams } from "@/features/team/ui/use-team-params";
import { AppIconRow, ResendInviteButton } from "@/features/team/ui/bits";
import { PeopleTable } from "@/features/team/ui/PeopleTable";
import { MemberEditor } from "@/features/team/ui/MemberEditor";

const ICONS = { invite: Mail, seats: Armchair, "client-no-access": ShieldCheck };

function InsightCard({ title, icon: Icon, children, className }) {
  return (
    <section className={cn("bg-card p-6", className)} style={{ borderRadius: "var(--card-radius)" }}>
      <h2 className="mb-4 flex items-center gap-2.5 text-[17px] font-medium text-text">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-subtle"><Icon size={16} strokeWidth={1.75} aria-hidden /></span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Grove: overview and cards (P2b). Needs attention, seats and app usage on top, people as cards below
 * with a cards/table switch. "Edit access" opens a drawer.
 */
export function GroveTeam({ data, viewer }) {
  const { members, seats, appUsage, needsAttention, timezone } = data;
  const { params, set } = useTeamParams();
  const [q, setQ] = useDebouncedQuery(params.q, (v) => set({ q: v }));
  const [view, setView] = useState("cards");
  const statuses = statusCounts(members);
  const filtered = useMemo(() => filterMembers(members, { role: params.role, status: params.status, q: params.q }), [members, params.role, params.status, params.q]);
  const open = members.find((m) => m.id === params.id && canOpenMember(viewer, m));
  const pct = Math.round((seats.used / Math.max(seats.limit, 1)) * 100);
  const usage = Object.entries(appUsage).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxUse = Math.max(...usage.map(([, n]) => n), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-5 max-[1100px]:grid-cols-1">
        <InsightCard title="Needs attention" icon={CircleAlert}>
          {needsAttention.length === 0 ? <p className="text-muted">Nothing needs your attention.</p> : (
            <ul className="flex flex-col gap-3">
              {needsAttention.map((n, i) => {
                const Icon = ICONS[n.kind] ?? CircleAlert;
                const member = n.memberId ? members.find((m) => m.id === n.memberId) : null;
                return (
                  <li key={i} className="flex items-center gap-3 rounded-[18px] bg-subtle p-3.5">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-card"><Icon size={18} strokeWidth={1.75} aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{n.kind === "seats" ? `${appLabel(n.app)} has ${n.left} ${n.left === 1 ? "seat" : "seats"} left` : n.title}</p>
                      <p className="truncate text-sm text-muted">{n.kind === "invite" && member?.invitedAt ? `${roleLabel(member.role)} · sent ${daysAgo(member.invitedAt, new Date(), timezone)}` : n.detail}</p>
                    </div>
                    {member && canEditMember(viewer, member) ? (n.kind === "invite" ? <ResendInviteButton member={member} /> : <Button size="sm" variant="primary" onClick={() => set({ id: member.id })}>{n.kind === "client-no-access" ? "Give access" : "Edit access"}</Button>) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </InsightCard>

        <InsightCard title="Seats" icon={Armchair}>
          <div className="flex items-baseline gap-3">
            <span className="tabular font-display-theme text-[56px] leading-none">{seats.used}/{seats.limit}</span>
            <span className="rounded-full bg-subtle px-2.5 py-0.5 text-sm">{pct}%</span>
          </div>
          <div className="mt-8 h-3.5 overflow-hidden rounded-full bg-subtle-2" role="img" aria-label={`${seats.used} of ${seats.limit} seats used`}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#4e7a10,#a6c64a)" }} />
          </div>
          <p className="mt-3 text-sm text-muted">{seats.left} {seats.left === 1 ? "seat" : "seats"} left. Client logins are free.</p>
        </InsightCard>

        <InsightCard title="Who uses which app" icon={LayoutGrid}>
          <ul className="flex flex-col gap-3.5">
            {usage.map(([code, n]) => (
              <li key={code} className="grid grid-cols-[110px_1fr_24px] items-center gap-3 text-sm">
                <span className="flex items-center gap-2 text-ink"><span aria-hidden className="size-2 rounded-full" style={{ background: `var(--app-${code.toLowerCase()})` }} />{appLabel(code)}</span>
                <span className="h-2.5 rounded-full bg-subtle-2"><span className="block h-full rounded-full" style={{ width: `${(n / maxUse) * 100}%`, background: "var(--chart-purple)" }} /></span>
                <span className="tabular text-right text-ink">{n}</span>
              </li>
            ))}
          </ul>
        </InsightCard>
      </div>

      <section aria-label="People">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <h2 className="font-display-theme mr-2 flex items-center gap-2 text-[28px]">People <span className="tabular rounded-full bg-subtle px-2.5 text-sm font-medium not-italic">{members.length}</span></h2>
          <label className="min-w-[220px] flex-1">
            <span className="sr-only">Search by name or email</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="h-10 w-full rounded-full border border-line bg-input px-4 text-ink outline-none placeholder:text-muted" />
          </label>
          <div className="w-40"><Select label="Role" value={params.role ?? ""} onChange={(e) => set({ role: e.target.value || null })} options={[{ value: "", label: "All roles" }, ...ROLES.map((r) => ({ value: r.toLowerCase(), label: roleLabel(r) }))]} /></div>
          <SegmentedTabs label="Status" value={params.status ?? "all"} onChange={(v) => set({ status: v === "all" ? null : v })} items={[{ value: "all", label: "All", count: statuses.all }, { value: "active", label: "Active", count: statuses.active ?? 0 }, { value: "invited", label: "Invited", count: statuses.invited ?? 0 }, ...(statuses.inactive ? [{ value: "inactive", label: "Inactive", count: statuses.inactive }] : [])]} />
          <div className="flex gap-1 rounded-full bg-subtle p-1">
            <IconButton icon={LayoutGrid} label="Cards view" variant={view === "cards" ? "filled" : "plain"} size={32} onClick={() => setView("cards")} />
            <IconButton icon={List} label="Table view" variant={view === "table" ? "filled" : "plain"} size={32} onClick={() => setView("table")} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-card" style={{ borderRadius: "var(--card-radius)" }}>
            <EmptyState icon={UserSearch} title="No people match these filters" action={<Button size="sm" onClick={() => { setQ(""); set({ role: null, status: null, q: null }); }}>Clear filters</Button>} />
          </div>
        ) : view === "table" ? (
          <div className="bg-card p-5" style={{ borderRadius: "var(--card-radius)" }}>
            <PeopleTable members={filtered} viewer={viewer} timezone={timezone} onOpen={(m) => canOpenMember(viewer, m) && set({ id: m.id })} />
          </div>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {filtered.map((m) => (
              <li key={m.id} className={cn("flex flex-col gap-3 bg-card p-5", m.status === "invited" && "border-2 border-dashed border-line")} style={{ borderRadius: "24px" }}>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-subtle px-2.5 py-0.5 text-xs font-medium text-text">{roleLabel(m.role)}</span>
                  <StatusChip status={m.status} />
                </div>
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} size={48} />
                  <div className="min-w-0"><p className="truncate text-[17px] font-medium text-ink">{m.name}</p><p className="truncate text-sm text-muted">{m.email}</p></div>
                </div>
                <p className="text-sm text-text">{roleLabel(m.role)} · {m.role === "OWNER" ? "Workspace owner" : m.reportsToName ? `Reports to ${m.reportsToName}` : "No manager"}</p>
                <div className="flex items-center justify-between"><AppIconRow apps={m.apps} /><span className="tabular text-sm text-muted">{m.apps.length}/7</span></div>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
                  <span className="text-sm text-muted">{m.status === "invited" && m.invitedAt ? `Sent ${daysAgo(m.invitedAt, new Date(), timezone)}` : formatRelative(m.lastActiveAt, new Date(), timezone)}</span>
                  {m.status === "invited" && canEditMember(viewer, m) ? <ResendInviteButton member={m} /> : canOpenMember(viewer, m) ? <Button size="sm" onClick={() => set({ id: m.id })}>{canEditMember(viewer, m) ? "Edit access" : "View"}</Button> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Drawer open={!!open} onClose={() => set({ id: null })} title="Person details">
        {open ? <MemberEditor key={open.id} member={open} members={members} viewer={viewer} timezone={timezone} onDone={() => set({ id: null })} /> : null}
      </Drawer>
    </div>
  );
}
