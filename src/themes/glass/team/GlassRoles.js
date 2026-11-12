import Link from "next/link";
import { RolesMatrix } from "@/features/team/ui/RolesMatrix";

/** Glass: one calm card with a serif title and the read-only matrix. */
export function GlassRoles({ counts, yourRole }) {
  return (
    <section aria-label="Roles and permissions" className="bg-card p-8" style={{ borderRadius: "var(--card-radius)", border: "var(--card-border)" }}>
      <h2 className="font-display-theme text-[28px]">Roles and permissions</h2>
      <p className="mt-1 max-w-[70ch] text-text">What each role can do. A person&apos;s role is set on the People page; this page only shows the rules.</p>
      <RolesMatrix counts={counts} yourRole={yourRole} className="mt-6" />
      <p className="mt-4 text-sm text-muted">There is one Owner. Ownership moves only when the Owner hands it over.{yourRole === "OWNER" ? <> <Link href="/hub/settings/ownership" className="font-medium text-ink underline underline-offset-2">Transfer ownership</Link></> : null}</p>
    </section>
  );
}
