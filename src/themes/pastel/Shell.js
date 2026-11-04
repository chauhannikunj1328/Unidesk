import { IconRail } from "./IconRail";
import { UtilityPill } from "./UtilityPill";

/** Pastel: icon rail on the left; a floating utility pill (search, organization, bell, avatar) top right of every page. */
export function PastelShell({ session, children }) {
  return (
    <div className="min-h-screen p-6 max-[1100px]:p-3">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-[1440px] overflow-hidden" style={{ background: "var(--shell-bg)", borderRadius: "var(--shell-radius)" }}>
        <IconRail session={session} />
        <div className="min-w-0 flex-1 px-8 py-6">
          <div className="mb-4 flex justify-end"><UtilityPill session={session} /></div>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
