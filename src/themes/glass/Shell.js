import { Sidebar } from "@/components/shell/Sidebar";

/** Glass: frosted shell on the warm gradient, full sidebar, page title row with search / bell / avatar. */
export function GlassShell({ session, children }) {
  return (
    <div className="min-h-screen p-6 max-[1100px]:p-3">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-[1440px] overflow-hidden" style={{ background: "var(--shell-bg)", backdropFilter: "var(--shell-blur)", WebkitBackdropFilter: "var(--shell-blur)", borderRadius: "var(--shell-radius)", padding: "var(--shell-padding)" }}>
        <Sidebar session={session} />
        <main className="min-w-0 flex-1 px-8 py-7" style={{ background: "var(--surface)", borderRadius: "var(--surface-radius)" }}>{children}</main>
      </div>
    </div>
  );
}
