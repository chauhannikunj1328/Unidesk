"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "./cn";

/**
 * Dropdown menu. `trigger` receives ({ open, toggle }) and renders the button (usually an IconButton with Ellipsis).
 * items: { label, icon, onSelect, danger, separator }. Danger items go last. Escape closes.
 */
export function Menu({ trigger, items, align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open ? (
        <ul role="menu" className={cn("absolute z-40 mt-2 min-w-48 bg-card p-1.5 text-text", align === "right" ? "right-0" : "left-0")} style={{ borderRadius: "16px", border: "var(--card-border)", boxShadow: "var(--shadow-float)" }}>
          {items.map((it, i) =>
            it.separator ? (
              <li key={i} role="separator" className="my-1 h-px bg-line" />
            ) : it.heading ? (
              <li key={i} role="presentation" className="px-3 py-2"><p className="font-medium text-ink">{it.heading}</p>{it.sub ? <p className="text-xs text-muted">{it.sub}</p> : null}</li>
            ) : (
              <li key={it.label} role="none">
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => { setOpen(false); it.onSelect?.(); }}
                  className={cn("flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left hover:bg-subtle", it.danger && "text-danger")}
                >
                  {it.icon ? <it.icon size={16} strokeWidth={1.75} aria-hidden /> : null}
                  {it.label}
                </button>
              </li>
            )
          )}
        </ul>
      ) : null}
    </div>
  );
}
