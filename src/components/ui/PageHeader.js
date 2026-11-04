import { cn } from "./cn";

/**
 * Title, one line of description, at most one primary and two secondary actions.
 * Extra actions belong in a Menu under an Ellipsis trigger. Grove renders this on the green band.
 */
export function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <header
      className={cn("mb-6 flex items-end justify-between gap-6", className)}
      style={{ background: "var(--header-bg)", color: "var(--on-header)", borderRadius: "var(--card-radius)", padding: "var(--header-pad)" }}
      data-page-header data-on-image
    >
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-sm" style={{ color: "inherit", opacity: 0.7 }}>{eyebrow}</p> : null}
        <h1 className="font-display-theme truncate text-[40px] leading-[1.1]" style={{ color: "var(--on-header)" }}>
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-[70ch] truncate text-[15px]" title={description} style={{ color: "inherit", opacity: 0.75 }}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
