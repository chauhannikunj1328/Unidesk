"use client";
import { useTheme } from "./ThemeProvider";
import { NavTabs } from "./NavTabs";
import { SearchTrigger } from "./CommandPalette";
import { NotificationsBell } from "./NotificationsBell";
import { ProfileMenu } from "./ProfileMenu";
import { formatDate } from "@/lib/dates";

/**
 * One set of props, three structures (12-Theme-Pattern-Language.md).
 * glass: serif title row with summary badge, search / bell / avatar / actions on the right, underline tabs.
 * pastel: eyebrow over title, pill tabs and the primary action on the right (utility pill lives in the shell).
 * grove: green hero band with date, title, chips, tabs, search and actions.
 * @param {{ eyebrow?: string, title: string, summary?: string, description?: string, chips?: {label:string, dot?:string}[], tabs?: {href:string,label:string,count?:number}[], actions?: import("react").ReactNode, user?: {name:string}, timezone?: string }} props
 */
export function ThemePageHeader({ eyebrow, title, summary, description, chips = [], tabs = [], actions, user, timezone, greeting }) {
  const theme = useTheme();

  if (theme === "pastel") {
    return (
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? <p className="mb-0.5 text-sm text-muted">{eyebrow}</p> : null}
          <h1 className="font-display-theme truncate text-[40px] leading-[1.1]">{title}</h1>
          {description ? <p className="mt-1 max-w-[70ch] line-clamp-2 text-muted" title={description}>{description}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          <NavTabs items={tabs} />
          {actions}
        </div>
      </header>
    );
  }

  if (theme === "grove") {
    return (
      <header data-on-image data-page-header className="mb-6 flex flex-col gap-4 text-white" style={{ background: "var(--header-bg)", borderRadius: "var(--card-radius)", padding: "var(--header-pad)", paddingBottom: tabs.length > 1 ? 0 : undefined, position: "relative", overflow: "hidden" }}>
        {/* 30% dark overlay: white text must stay readable on the light part of the gradient (AA) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/35" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1 text-sm text-white/85">{[eyebrow, formatDate(new Date(), timezone)].filter(Boolean).join(" · ")}</p>
            {greeting ? <p className="truncate text-[40px] leading-[1.1] text-white" style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}>{greeting}</p> : null}
            <h1 className="font-display-theme truncate text-[48px] leading-[1.05] text-white" style={{ color: "#fff" }}>{title}</h1>
            {description ? <p className="mt-2 max-w-[70ch] line-clamp-2 text-white/90" title={description}>{description}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <SearchTrigger onBand placeholder="Search" />
            {actions}
          </div>
        </div>
        {chips.length ? (
          <div className="relative flex flex-wrap gap-2 pb-6">
            {chips.map((c) => (
              <span key={c.label} className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1 text-sm text-white">
                {c.dot ? <span aria-hidden className="size-1.5 rounded-full" style={{ background: c.dot }} /> : null}
                {c.label}
              </span>
            ))}
          </div>
        ) : null}
        {tabs.length > 1 ? <div className="relative"><NavTabs items={tabs} /></div> : null}
      </header>
    );
  }

  // glass
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <h1 className="font-display-theme truncate text-[44px] leading-[1.05]">{title}</h1>
          {summary ? <span className="rounded-full bg-subtle-2 px-3 py-1 text-sm text-text">{summary}</span> : null}
        </div>
        <div className="flex items-center gap-2.5">
          <SearchTrigger placeholder="Search" />
          <NotificationsBell />
          {user ? <ProfileMenu name={user.name} email={user.email} size={40} className="!bg-primary !text-on-primary" /> : null}
          {actions}
        </div>
      </div>
      {description ? <p className="mt-1 max-w-[70ch] line-clamp-2 text-muted" title={description}>{description}</p> : null}
      {tabs.length > 1 ? <div className="mt-4 border-b border-line"><NavTabs items={tabs} /></div> : null}
    </header>
  );
}
