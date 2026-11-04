"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { Layer } from "@/components/ui/Layer";
import { HUB_NAV, APPS, isBuilt } from "@/lib/nav";
import { cn } from "@/components/ui/cn";

const PaletteContext = createContext(() => {});
export const useCommandPalette = () => useContext(PaletteContext);

/** ⌘K opens a list of pages and apps. People and records join it as their flows are built (Hub flow 25). */
export function CommandPaletteProvider({ apps, children }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(true), []);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <PaletteContext.Provider value={toggle}>
      {children}
      <PaletteDialog open={open} onClose={() => setOpen(false)} apps={apps} />
    </PaletteContext.Provider>
  );
}

function PaletteDialog({ open, onClose, apps }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);

  const items = useMemo(() => {
    const pages = HUB_NAV.flatMap((g) => g.items ?? []).filter(isBuilt).map((i) => ({ label: i.label, href: i.href, icon: i.icon, hint: "Page" }));
    const appItems = APPS.filter((a) => apps.includes(a.code)).map((a) => ({ label: a.label, href: a.href, icon: a.icon, hint: "App", dot: a.dot }));
    return [...pages, ...appItems];
  }, [apps]);
  const results = items.filter((i) => i.label.toLowerCase().includes(q.trim().toLowerCase()));

  useEffect(() => { if (open) { setQ(""); setIndex(0); setTimeout(() => inputRef.current?.focus(), 0); } }, [open]);

  function go(item) { onClose(); router.push(item.href); }
  function onKeyDown(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && results[index]) go(results[index]);
  }

  return (
    <Layer open={open} onClose={onClose} labelledBy="palette-label">
      <div className="w-[min(560px,calc(100vw-32px))] overflow-hidden" style={{ borderRadius: "var(--card-radius)" }}>
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <Search size={16} strokeWidth={1.75} aria-hidden className="text-muted" />
          <label id="palette-label" className="sr-only">Search pages and apps</label>
          <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setIndex(0); }} onKeyDown={onKeyDown} placeholder="Search pages and apps" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
        </div>
        <ul role="listbox" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? <li className="px-3 py-6 text-center text-muted">No results for “{q}”</li> : null}
          {results.map((r, i) => (
            <li key={r.href} role="option" aria-selected={i === index}>
              <button type="button" onClick={() => go(r)} onMouseEnter={() => setIndex(i)} className={cn("flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left", i === index && "bg-subtle")}>
                {r.dot ? <span aria-hidden className="size-2 rounded-full" style={{ background: r.dot }} /> : <r.icon size={16} strokeWidth={1.75} aria-hidden />}
                <span className="flex-1 text-ink">{r.label}</span>
                <span className="text-xs text-muted">{r.hint}</span>
                {i === index ? <CornerDownLeft size={14} strokeWidth={1.75} aria-hidden className="text-muted" /> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Layer>
  );
}

/** The visible search control. `variant="field"` looks like an input; `"icon"` is a round button. */
export function SearchTrigger({ variant = "field", placeholder = "Search", onBand = false }) {
  const open = useCommandPalette();
  if (variant === "icon") {
    return (
      <button type="button" onClick={open} aria-label="Search" title="Search (⌘K)" className="inline-flex size-9 items-center justify-center rounded-full border border-line bg-input text-ink">
        <Search size={16} strokeWidth={1.75} aria-hidden />
      </button>
    );
  }
  return (
    <button type="button" onClick={open} aria-label="Search" className={cn("flex h-10 min-w-[220px] items-center gap-2.5 rounded-[var(--control-radius)] px-3.5 text-left", onBand ? "bg-white/15 text-white" : "border border-line bg-input text-muted")}>
      <Search size={16} strokeWidth={1.75} aria-hidden />
      <span className="flex-1">{placeholder}</span>
      <kbd className={cn("rounded px-1.5 py-0.5 text-[11px]", onBand ? "bg-white/20" : "bg-subtle")}>⌘K</kbd>
    </button>
  );
}
