import Link from "next/link";
import { roleLabel } from "@/lib/labels";
import { ROLE_HELP } from "@/features/team/constants";
import { ROLE_ORDER } from "@/features/team/roles-rules";
import { RolesMatrix } from "@/features/team/ui/RolesMatrix";

/** Grove: a card per role (who it is for, how many people), then the matrix in a card. */
export function GroveRoles({ counts, yourRole }) {
  return (
    <div className="flex flex-col gap-6">
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
        {ROLE_ORDER.map((r) => (
          <li key={r} className="flex flex-col gap-2 bg-card p-5" style={{ borderRadius: "24px" }}>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-subtle px-2.5 py-0.5 text-xs font-medium text-text">{roleLabel(r)}</span>
              {r === yourRole ? <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-on-accent-soft">You</span> : null}
            </div>
            <p className="tabular font-display-theme text-[40px] leading-none">{counts[r] ?? 0}</p>
            <p className="text-sm text-text">{ROLE_HELP[r]}</p>
          </li>
        ))}
      </ul>
      <section aria-label="Roles and permissions" className="bg-card p-6" style={{ borderRadius: "var(--card-radius)" }}>
        <p className="mb-4 max-w-[70ch] text-text">What each role can do. A person&apos;s role is set on the People page; this page only shows the rules.</p>
        <RolesMatrix counts={counts} yourRole={yourRole} />
        {yourRole === "OWNER" ? <p className="mt-4 text-sm text-muted">There is one Owner. <Link href="/hub/settings/ownership" className="font-medium text-ink underline underline-offset-2">Transfer ownership</Link></p> : null}
      </section>
    </div>
  );
}
