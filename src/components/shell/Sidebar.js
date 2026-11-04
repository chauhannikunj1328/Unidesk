"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HUB_NAV, APPS, isBuilt } from "@/lib/nav";
import { Avatar } from "@/components/ui/Avatar";
import { roleLabel } from "@/lib/labels";
import { cn } from "@/components/ui/cn";

export function NavItem({ item, active }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={cn("flex h-10 items-center gap-3 px-3 text-sm font-medium transition-colors duration-150 max-[1100px]:justify-center", active ? "" : "text-text hover:bg-black/5")}
      style={{ borderRadius: "var(--nav-radius)", ...(active ? { background: "var(--nav-active-bg)", color: "var(--nav-active-text)", boxShadow: "var(--nav-active-shadow)" } : {}) }}
    >
      {item.dot ? (
        <span className="relative inline-flex">
          <Icon size={16} strokeWidth={1.75} aria-hidden />
          <span aria-hidden className="absolute -right-1 -top-1 size-1.5 rounded-full" style={{ background: item.dot }} />
        </span>
      ) : (
        <Icon size={16} strokeWidth={1.75} aria-hidden />
      )}
      <span className="truncate max-[1100px]:hidden">{item.label}</span>
    </Link>
  );
}

export function NavGroup({ label, children }) {
  return (
    <div className="mt-5 first:mt-0">
      {label ? <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wide text-muted max-[1100px]:hidden">{label}</p> : null}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

export function UserCard({ name, role, org }) {
  return (
    <div className="flex items-center gap-3 px-2 py-2 max-[1100px]:justify-center">
      <Avatar name={name} size={36} />
      <div className="min-w-0 max-[1100px]:hidden">
        <p className="truncate font-medium text-ink">{name}</p>
        <p className="truncate text-xs text-muted">{roleLabel(role)} · {org}</p>
      </div>
    </div>
  );
}

/** Hub sidebar. Groups with no visible items are not rendered; each enabled app is listed once. */
export function Sidebar({ session }) {
  const pathname = usePathname();
  const isActive = (item) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/"));
  return (
    <aside className="flex w-[248px] shrink-0 flex-col p-4 max-[1100px]:w-[72px] max-[1100px]:px-2" style={{ background: "var(--sidebar-bg)" }}>
      <Link href="/hub" className="mb-6 flex items-center gap-2 px-3 font-display-theme text-2xl max-[1100px]:justify-center max-[1100px]:px-0">
        <span aria-hidden className="inline-flex size-7 items-center justify-center rounded-lg bg-primary text-sm text-on-primary" style={{ fontStyle: "normal", fontFamily: "var(--font-ui)" }}>U</span>
        <span className="max-[1100px]:hidden">Unidesk</span>
      </Link>
      <nav className="flex-1 overflow-y-auto" aria-label="Main">
        {HUB_NAV.map((g, i) => {
          if (g.apps) {
            const apps = APPS.filter((a) => session.apps.includes(a.code));
            if (apps.length === 0) return null;
            return (
              <NavGroup key={g.group} label={g.group}>
                {apps.map((a) => <NavItem key={a.code} item={a} active={pathname.startsWith(a.href)} />)}
              </NavGroup>
            );
          }
          const items = g.items.filter((it) => isBuilt(it) && (!it.roles || it.roles.includes(session.role)));
          if (items.length === 0) return null;
          return (
            <NavGroup key={g.group ?? i} label={g.group}>
              {items.map((it) => <NavItem key={it.href} item={it} active={isActive(it)} />)}
            </NavGroup>
          );
        })}
      </nav>
      <div className="mt-4 border-t border-line pt-3">
        <UserCard name={session.name} role={session.role} org={session.orgName} />
      </div>
    </aside>
  );
}
