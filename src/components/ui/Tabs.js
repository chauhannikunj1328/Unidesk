"use client";
import { cn } from "./cn";

/**
 * Page sections. Underline in glass, pill in pastel, header tabs on the green band in grove.
 * The look comes from the theme through `data-tabs` styles in globals.css.
 */
export function Tabs({ items, value, onChange, label = "Sections" }) {
  return (
    <div role="tablist" aria-label={label} data-tabs className="flex items-center gap-1">
      {items.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          data-active={value === t.value}
          className="px-4 py-2 text-sm font-medium"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Status filters with counts. */
export function SegmentedTabs({ items, value, onChange, label = "Filter" }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex items-center gap-1 rounded-[var(--pill-radius)] bg-subtle p-1">
      {items.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "inline-flex items-center gap-2 rounded-[var(--pill-radius)] px-3 py-1.5 text-[13px] font-medium transition-colors",
            value === t.value ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"
          )}
        >
          {t.label}
          {t.count != null ? <span className="tabular text-muted">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
