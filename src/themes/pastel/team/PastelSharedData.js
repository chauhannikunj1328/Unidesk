"use client";
import { Check, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DATA_LABELS, DATA_TYPES, rowWarning } from "@/features/team/shared-data-rules";
import { COLUMN_HELP, useSharedData } from "@/features/team/ui/shared-data-shared";

const GRID = "grid grid-cols-[minmax(240px,1fr)_repeat(3,120px)] items-center gap-3 max-[800px]:grid-cols-[minmax(150px,1fr)_repeat(3,72px)]";

/** One round cell: filled black with a tick when the app can read it, an empty ring when it cannot. */
function Cell({ on, busy, label, onToggle }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={busy} onClick={() => onToggle(!on)} className="mx-auto inline-flex size-10 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-50" style={on ? { background: "#111", borderColor: "#111", color: "#fff" } : { background: "#fff", borderColor: "var(--line)", color: "transparent" }}>
      <Check size={18} strokeWidth={2.5} aria-hidden />
    </button>
  );
}

/** Pastel: the matrix itself. Apps down the side, round cells across, column counts, a legend and "Undo last change". */
export function PastelSharedData({ data }) {
  const s = useSharedData(data.apps);
  const total = s.apps.length;
  return (
    <section aria-label="Shared data" className="bg-card p-5" style={{ borderRadius: "var(--card-radius)" }}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-display-theme mr-2 text-[24px]">Shared data</h2>
        <span className="flex items-center gap-4 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-flex size-5 items-center justify-center rounded-full bg-black text-white"><Check size={12} strokeWidth={3} /></span>Can read</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-5 rounded-full border-2 border-line" />Can&apos;t read</span>
        </span>
        <Button className="ml-auto" size="sm" icon={Undo2} disabled={!s.last} onClick={s.undoLast}>Undo last change</Button>
      </div>
      <div className={`${GRID} rounded-full px-4 py-3 text-xs font-medium text-muted`} style={{ background: "var(--table-head-bg)" }} role="presentation">
        <span>App</span>
        {DATA_TYPES.map((t) => <span key={t} className="text-center" title={COLUMN_HELP[t]}>{DATA_LABELS[t]}</span>)}
      </div>
      <ul>
        {s.apps.map((a) => {
          const warn = rowWarning(a.code, a.settings);
          return (
            <li key={a.code} className="border-b border-line px-4 py-3">
              <div className={GRID}>
                <div className="flex items-center gap-3">
                  <span aria-hidden className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-subtle"><span className="size-3.5 rounded-full" style={{ background: a.dot }} /></span>
                  <div className="min-w-0"><p className="font-medium text-ink">{a.label} <span className="tabular ml-1 rounded-full bg-subtle px-2 text-xs font-medium">{a.count} of 3</span></p><p className="truncate text-sm text-muted">{a.description}</p></div>
                </div>
                {DATA_TYPES.map((t) => <Cell key={t} on={a.settings[t]} busy={s.busy === `${a.code}:${t}`} label={`${a.label} can read ${t}`} onToggle={(v) => s.request(a.code, t, v)} />)}
              </div>
              {warn ? <p role="status" className="mt-2 pl-14 text-sm text-warning">{warn}</p> : null}
            </li>
          );
        })}
        <li className={`${GRID} px-4 py-3 text-sm text-muted`}>
          <span>Apps that can read it</span>
          {DATA_TYPES.map((t) => <span key={t} className="tabular text-center font-medium text-ink">{s.apps.filter((a) => a.settings[t]).length} of {total}</span>)}
        </li>
      </ul>
      {s.dialog}
    </section>
  );
}
