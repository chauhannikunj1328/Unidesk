"use client";
import { Toggle } from "@/components/ui/Toggle";
import { DATA_LABELS, DATA_TYPES, rowWarning } from "@/features/team/shared-data-rules";
import { COLUMN_HELP, useSharedData } from "@/features/team/ui/shared-data-shared";

/** Grove: a card with a table of green switches, and a purple "2 of 3" meter under each app. */
export function GroveSharedData({ data }) {
  const s = useSharedData(data.apps);
  return (
    <section aria-label="Shared data" className="bg-card p-6" style={{ borderRadius: "var(--card-radius)" }}>
      <p className="mb-4 max-w-[70ch] text-text">Choose which apps can read your contacts, clients and projects. Changes apply right away; open apps update the next time they load.</p>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-xs font-medium text-muted">
              <th scope="col" className="rounded-l-[14px] bg-[var(--table-head-bg)] px-4 py-3">App</th>
              {DATA_TYPES.map((t, i) => <th key={t} scope="col" title={COLUMN_HELP[t]} className={`bg-[var(--table-head-bg)] px-4 py-3 text-center ${i === 2 ? "rounded-r-[14px]" : ""}`}>{DATA_LABELS[t]}</th>)}
            </tr>
          </thead>
          <tbody>
            {s.apps.map((a) => {
              const warn = rowWarning(a.code, a.settings);
              return (
                <tr key={a.code}>
                  <td className="border-b border-line px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span aria-hidden className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-subtle"><span className="size-3 rounded-full" style={{ background: a.dot }} /></span>
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{a.label}</p>
                        <p className="text-sm text-muted">{a.description}</p>
                        <div className="mt-1.5 flex items-center gap-2"><span aria-hidden className="h-1.5 w-16 overflow-hidden rounded-full bg-subtle-2"><span className="block h-full rounded-full" style={{ width: `${(a.count / 3) * 100}%`, background: "var(--chart-purple)" }} /></span><span className="tabular text-xs font-medium text-ink">{a.count} of 3</span></div>
                        {warn ? <p role="status" className="mt-1.5 text-sm text-warning">{warn}</p> : null}
                      </div>
                    </div>
                  </td>
                  {DATA_TYPES.map((t) => (
                    <td key={t} className="border-b border-line px-4 py-4 text-center"><Toggle checked={a.settings[t]} disabled={s.busy === `${a.code}:${t}`} label={`${a.label} can read ${t}`} onChange={(v) => s.request(a.code, t, v)} /></td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {s.dialog}
    </section>
  );
}
