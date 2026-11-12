"use client";
import { Ban, Crown, Ellipsis, RotateCcw, Send, Trash2, UserCog } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { DataTable } from "@/components/ui/DataTable";
import { IconButton } from "@/components/ui/IconButton";
import { Menu } from "@/components/ui/Menu";
import { StatusChip } from "@/components/ui/StatusChip";
import { useTheme } from "@/components/shell/ThemeProvider";
import { useToast } from "@/components/ui/Toast";
import { resendInviteAction } from "../invite-actions";
import { useMemberActions } from "./member-actions";
import { formatRelative, daysAgo } from "@/lib/dates";
import { canEditMember, canOpenMember } from "../permissions";
import { AppChips, RoleChip } from "./bits";

/** Pastel shows status as a black pill with a dot (Invited: dashed outline); other themes use the shared StatusChip. */
function Status({ member, timezone }) {
  const theme = useTheme();
  return (
    <div className="flex flex-col items-start gap-1">
      {theme === "pastel" ? (
        member.status === "active" ? <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-primary px-3 text-[13px] font-medium text-on-primary"><span aria-hidden className="size-1.5 rounded-full" style={{ background: "var(--highlight)" }} />Active</span>
        : member.status === "invited" ? <span className="inline-flex h-7 items-center rounded-full border border-dashed border-muted px-3 text-[13px] text-muted">Invited</span>
        : <StatusChip status={member.status} />
      ) : <StatusChip status={member.status} />}
      {member.status === "invited" && member.invitedAt ? <span className="text-xs text-muted">Sent {daysAgo(member.invitedAt, new Date(), timezone)}</span> : null}
    </div>
  );
}

/** Members table (04-team-people-list.md). Same columns and menu in every theme that shows a table. */
export function PeopleTable({ members, viewer, timezone, onOpen, empty }) {
  const toast = useToast();
  const actions = useMemberActions();
  async function resend(m) {
    const r = await resendInviteAction({ membershipId: m.id });
    toast(r.ok ? { kind: "success", message: `Invite sent again to ${r.email}` } : { kind: "error", message: r.error });
  }
  const columns = [
    { key: "name", header: "Member", render: (m) => (
      <span className="flex items-center gap-3"><Avatar name={m.name} size={36} /><span className="min-w-0"><span className="block truncate font-medium text-ink">{m.name}</span><span className="block truncate text-sm font-normal text-muted">{m.email}</span></span></span>
    ) },
    { key: "role", header: "Role", render: (m) => <RoleChip role={m.role} /> },
    { key: "reportsTo", header: "Reports to", render: (m) => (m.role === "OWNER" ? <span className="text-muted">Workspace owner</span> : m.reportsToName ?? <span className="text-muted">—</span>) },
    { key: "apps", header: "App access", render: (m) => <AppChips apps={m.apps} role={m.role} /> },
    { key: "status", header: "Status", render: (m) => <Status member={m} timezone={timezone} /> },
    { key: "last", header: "Last active", render: (m) => <span className="text-muted">{m.status === "invited" ? "" : formatRelative(m.lastActiveAt, new Date(), timezone)}</span> },
    { key: "actions", header: <span className="sr-only">Actions</span>, align: "right", render: (m) => (
      canEditMember(viewer, m) ? (
        <span onClick={(e) => e.stopPropagation()}>
          <Menu items={[
            { label: "Edit access", icon: UserCog, onSelect: () => onOpen(m) },
            ...(m.status === "invited" ? [{ label: "Resend invite", icon: Send, onSelect: () => resend(m) }] : []),
            ...(actions?.can("reactivate", m) ? [{ label: "Reactivate", icon: RotateCcw, onSelect: () => actions.ask("reactivate", m) }] : []),
            ...(actions?.can("owner", m) ? [{ label: "Make owner…", icon: Crown, onSelect: () => actions.ask("owner", m) }] : []),
            ...(actions?.can("deactivate", m) || actions?.can("remove", m) ? [{ separator: true }] : []),
            ...(actions?.can("deactivate", m) ? [{ label: "Deactivate", icon: Ban, danger: true, onSelect: () => actions.ask("deactivate", m) }] : []),
            ...(actions?.can("remove", m) ? [{ label: "Remove from workspace", icon: Trash2, danger: true, onSelect: () => actions.ask("remove", m) }] : []),
          ]} trigger={({ toggle }) => <IconButton icon={Ellipsis} label={`Actions for ${m.name}`} variant="outline" size={32} onClick={toggle} />} />
        </span>
      ) : null
    ) },
  ];
  return <DataTable columns={columns} rows={members} onRowClick={onOpen} rowClickable={(m) => canOpenMember(viewer, m)} empty={empty} />;
}
