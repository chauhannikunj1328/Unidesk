"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { HUB_NAV, APPS, isBuilt } from "@/lib/nav";
import { Menu } from "@/components/ui/Menu";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/components/ui/cn";

function RailButton({ href, label, active, children }) {
  return (
    <Link href={href} aria-label={label} title={label} aria-current={active ? "page" : undefined} className={cn("flex size-11 items-center justify-center rounded-full border transition-colors duration-150", active ? "border-transparent bg-primary text-on-primary" : "border-line bg-white text-ink hover:bg-subtle")}>
      {children}
    </Link>
  );
}

/** Pastel navigation: 72px rail of round buttons. Hub pages, then one coloured dot per app, avatar at the bottom. */
export function IconRail({ session }) {
  const pathname = usePathname();
  const hubItems = HUB_NAV.flatMap((g) => g.items ?? []).filter((i) => isBuilt(i) && (!i.roles || i.roles.includes(session.role)));
  const apps = APPS.filter((a) => session.apps.includes(a.code));
  return (
    <aside aria-label="Main" className="flex w-[84px] shrink-0 flex-col items-center gap-3 px-3 py-5" style={{ background: "var(--sidebar-bg)" }}>
      <Menu align="left" items={[{ label: "Hub", icon: LayoutGrid, onSelect: () => (window.location.href = "/hub") }, { separator: true }, ...apps.map((a) => ({ label: a.label, icon: a.icon, onSelect: () => (window.location.href = a.href) }))]} trigger={({ toggle }) => (
        <button type="button" onClick={toggle} aria-label="Switch app" title="Switch app" className="flex size-12 items-center justify-center rounded-full bg-primary text-on-primary"><LayoutGrid size={18} strokeWidth={1.75} aria-hidden /></button>
      )} />
      <nav className="mt-3 flex flex-col items-center gap-3" aria-label="Hub">
        {hubItems.map((i) => {
          const active = i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/");
          return <RailButton key={i.href} href={i.href} label={i.label} active={active}><i.icon size={18} strokeWidth={1.75} aria-hidden /></RailButton>;
        })}
      </nav>
      <div aria-hidden className="my-1 h-px w-8 bg-line" />
      <nav className="flex flex-col items-center gap-3" aria-label="Apps">
        {apps.map((a) => (
          <RailButton key={a.code} href={a.href} label={a.label} active={pathname.startsWith(a.href)}>
            <span aria-hidden className="size-3 rounded-full" style={{ background: a.dot }} />
          </RailButton>
        ))}
      </nav>
      <div className="mt-auto"><Avatar name={session.name} size={44} className="!bg-[#e8822f] !text-white" /></div>
    </aside>
  );
}
