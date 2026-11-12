import { Check, Minus } from "lucide-react";
import { roleLabel } from "@/lib/labels";
import { cn } from "@/components/ui/cn";
import { CAPABILITIES, ROLE_ORDER } from "../roles-rules";

/**
 * Read-only table: what each role can do. A tick is yes, a dash is no, words are a limited yes.
 * The viewer's own role column is marked "You". Used by the Roles tab and the pastel drawer.
 */
export function RolesMatrix({ counts, yourRole, className }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
        <caption className="sr-only">What each role can do</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 rounded-l-[14px] bg-[var(--table-head-bg)] px-4 py-3 text-xs font-medium text-muted">What they can do</th>
            {ROLE_ORDER.map((r, i) => (
              <th key={r} scope="col" className={cn("bg-[var(--table-head-bg)] px-3 py-3 text-center", i === ROLE_ORDER.length - 1 && "rounded-r-[14px]")}>
                <span className="block text-sm font-medium text-ink">{roleLabel(r)}</span>
                <span className="block text-xs font-normal text-muted">{counts[r] ?? 0} {(counts[r] ?? 0) === 1 ? "person" : "people"}</span>
                {r === yourRole ? <span className="mt-1 inline-flex rounded-full bg-accent-soft px-2 text-[11px] font-medium text-on-accent-soft">You</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CAPABILITIES.map((c) => (
            <tr key={c.id}>
              <th scope="row" className="sticky left-0 border-b border-line bg-card px-4 py-3 text-left text-sm font-medium text-ink">
                {c.label}
                {c.hint ? <span className="block text-xs font-normal text-muted">{c.hint}</span> : null}
              </th>
              {ROLE_ORDER.map((r) => {
                const v = c.values[r];
                return (
                  <td key={r} className={cn("border-b border-line px-3 py-3 text-center text-sm", r === yourRole && "bg-accent-soft/40")}>
                    {v === true ? <><Check size={18} strokeWidth={2} aria-hidden className="mx-auto text-success" /><span className="sr-only">Yes</span></>
                      : v === false ? <><Minus size={16} strokeWidth={1.75} aria-hidden className="mx-auto text-muted" /><span className="sr-only">No</span></>
                      : <span className="text-text">{v}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
