"use client";
import { Toggle } from "@/components/ui/Toggle";
import { DATA_LABELS, DATA_TYPES, rowWarning } from "@/features/team/shared-data-rules";
import { COLUMN_HELP, useSharedData } from "@/features/team/ui/shared-data-shared";

const GRID = "grid grid-cols-[minmax(240px,1fr)_repeat(3,110px)] items-center gap-4 max-[800px]:grid-cols-[minmax(150px,1fr)_repeat(3,72px)]";

/** Glass: one calm card with a serif title, a row per app and a purple switch in each column. */
export function GlassSharedData({ data }) {
  const s = useSharedData(data.apps);
  return (
    <section aria-label="Shared data" className="bg-card p-8" style={{ borderRadius: "var(--card-radius)", border: "var(--card-border)" }}>
      <h2 className="font-display-theme text-[28px]">Shared data</h2>
      <p className="mt-1 max-w-[70ch] text-text">Choose which apps can read your contacts, clients and projects. Changes apply right away; open apps update the next time they load.</p>
      <div className={`${GRID} mt-6 border-b border-line pb-3 text-xs font-medium text-muted`} role="presentation">
        <span>App</span>
        {DATA_TYPES.map((t) => <span key={t} className="text-center" title={COLUMN_HELP[t]}>{DATA_LABELS[t]}</span>)}
      </div>
      <ul className="divide-y divide-line">
        {s.apps.map((a) => {
          const warn = rowWarning(a.code, a.settings);
          return (
            <li key={a.code} className="py-4">
              <div className={GRID}>
                <div className="flex items-center gap-3">
                  <span aria-hidden className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-subtle"><span className="size-3 rounded-full" style={{ background: a.dot }} /></span>
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{a.label}</p>
                    <p className="truncate text-sm text-muted">{a.description}</p>
                    <p className="tabular text-xs font-medium text-accent">{a.count} of 3</p>
                  </div>
                </div>
                {DATA_TYPES.map((t) => (
                  <div key={t} className="flex justify-center"><Toggle checked={a.settings[t]} disabled={s.busy === `${a.code}:${t}`} label={`${a.label} can read ${t}`} onChange={(v) => s.request(a.code, t, v)} /></div>
                ))}
              </div>
              {warn ? <p role="status" className="mt-2 pl-14 text-sm text-warning">{warn}</p> : null}
            </li>
          );
        })}
      </ul>
      {s.dialog}
    </section>
  );
}
