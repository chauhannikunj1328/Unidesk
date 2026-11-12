"use client";
import { useTheme } from "@/components/shell/ThemeProvider";
import { roleLabel, appLabel } from "@/lib/labels";
import { appByCode } from "@/lib/apps";
import { APP_ICONS } from "@/components/shell/app-icons";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useState } from "react";
import { resendInviteAction } from "../invite-actions";
import { cn } from "@/components/ui/cn";

/** Pastel shows a coloured role chip; glass and grove show the role as plain words (per the designs). */
export function RoleChip({ role, className }) {
  const theme = useTheme();
  if (theme !== "pastel") return <span className={cn("text-ink", className)}>{roleLabel(role)}</span>;
  return (
    <span className={cn("inline-flex h-7 items-center rounded-full px-3 text-[13px] font-medium text-ink", className)} style={{ background: `var(--role-${role.toLowerCase()}, #e9e8e4)` }}>
      {roleLabel(role)}
    </span>
  );
}

/** Up to three app chips then "+N"; "All apps" for the owner. */
export function AppChips({ apps, role, max = 3 }) {
  if (role === "OWNER") return <Chip>All apps</Chip>;
  if (apps.length === 0) return <span className="text-muted">No apps</span>;
  const shown = apps.slice(0, max);
  return (
    <span className="inline-flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
      {shown.map((a) => <Chip key={a}>{appLabel(a)}</Chip>)}
      {apps.length > max ? <Chip>+{apps.length - max}</Chip> : null}
    </span>
  );
}

/** Seven small app icons, lit when the person can open the app (grove cards). */
export function AppIconRow({ apps }) {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`${apps.length} of 7 apps`}>
      {Object.keys(APP_ICONS).map((code) => {
        const Icon = APP_ICONS[code];
        const on = apps.includes(code);
        return (
          <span key={code} title={appByCode(code).label} className="inline-flex size-7 items-center justify-center rounded-lg border border-line" style={on ? { color: appByCode(code).hex, background: `${appByCode(code).hex}1a`, borderColor: "transparent" } : { color: "var(--muted)", opacity: 0.6 }}>
            <Icon size={14} strokeWidth={1.75} aria-hidden />
          </span>
        );
      })}
    </span>
  );
}

export const roleName = (role) => roleLabel(role);
export const appCount = (m) => (m.role === "OWNER" ? "All 7 apps" : `${m.apps.length} ${m.apps.length === 1 ? "app" : "apps"}`);

/** "Resend" for someone who has not joined yet: a black pill in every design that shows an invited person. */
export function ResendInviteButton({ member, size = "sm", variant = "primary" }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button size={size} variant={variant} loading={busy} onClick={async () => {
      setBusy(true);
      const r = await resendInviteAction({ membershipId: member.id });
      setBusy(false);
      toast(r.ok ? { kind: "success", message: `Invite sent again to ${r.email}` } : { kind: "error", message: r.error });
    }}>Resend</Button>
  );
}
