import { Sidebar } from "@/components/shell/Sidebar";

/** Glass: frosted shell on the warm gradient, full sidebar, page title row with search / bell / avatar. */
export function GlassShell({ session, children }) {
  return (
    <div className="min-h-screen p-6 max-[1100px]:p-3">
      <div className="flex min-h-[calc(100vh-48px)] w-full overflow-hidden" style={{ background: "var(--shell-bg)", backdropFilter: "var(--shell-blur)", WebkitBackdropFilter: "var(--shell-blur)", borderRadius: "var(--shell-radius)", padding: "var(--shell-padding)" }}>
        <Sidebar session={session} />
        <main className="min-w-0 flex-1 p-10 max-[1100px]:p-6" style={{ background: "var(--surface)", borderRadius: "var(--surface-radius)" }}>{children}</main>
      </div>
    </div>
  );
}
