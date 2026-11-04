"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Section tabs that are real pages. Look comes from the theme (underline, pill, or on the green band). */
export function NavTabs({ items, label = "Sections" }) {
  const pathname = usePathname();
  if (items.length < 2) return null; // a single tab is not a choice
  return (
    <nav aria-label={label} data-tabs className="flex items-center gap-1">
      {items.map((t) => {
        const active = pathname === t.href;
        return (
          <Link key={t.href} href={t.href} data-active={active} aria-current={active ? "page" : undefined} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium">
            {t.label}
            {t.count != null ? <span className="tabular rounded-full bg-black/5 px-1.5 text-xs">{t.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
