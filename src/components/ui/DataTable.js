"use client";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "./cn";
import { EmptyState } from "./EmptyState";

/**
 * Basic table: sticky first column, scroll cue, long names truncate with a tooltip.
 * columns: { key, header, render?(row), align?, sticky? }. Selection, sort, column menu and pagination arrive with the first list flow (Hub 04).
 */
export function DataTable({ columns, rows, rowKey = (r) => r.id, onRowClick, rowClickable = () => true, empty }) {
  const [scrolled, setScrolled] = useState(false);
  if (rows.length === 0) return empty ?? <EmptyState title="Nothing here yet" />;
  return (
    <div className="relative">
      <div className="overflow-x-auto" onScroll={(e) => setScrolled(e.currentTarget.scrollLeft > 0)}>
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn("sticky top-0 bg-[var(--table-head-bg)] px-4 py-3 text-xs font-medium text-muted", c.align === "right" && "text-right", i === 0 && "left-0 z-10")}
                  style={{ borderRadius: i === 0 ? "var(--table-head-radius) 0 0 var(--table-head-radius)" : i === columns.length - 1 ? "0 var(--table-head-radius) var(--table-head-radius) 0" : 0 }}
                >
                  {c.header}
                </th>
              ))}
              {onRowClick ? <th aria-label="Open" className="w-8 bg-[var(--table-head-bg)]" /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} onClick={onRowClick && rowClickable(r) ? () => onRowClick(r) : undefined} className={cn("h-14", onRowClick && rowClickable(r) && "cursor-pointer hover:bg-subtle")}>
                {columns.map((c, i) => {
                  const content = c.render ? c.render(r) : r[c.key];
                  return (
                    <td key={c.key} className={cn("max-w-[320px] truncate border-b border-line px-4 text-ink", c.align === "right" && "tabular text-right", i === 0 && cn("sticky left-0 bg-card font-medium", scrolled && "shadow-[2px_0_4px_rgba(0,0,0,0.06)]"))} title={typeof content === "string" ? content : undefined}>
                      {content}
                    </td>
                  );
                })}
                {onRowClick ? (
                  <td className="border-b border-line text-muted">
                    {rowClickable(r) ? <ChevronRight size={16} strokeWidth={1.75} aria-hidden /> : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--card)] to-transparent" />
    </div>
  );
}
