import { Sidebar } from "@/components/shell/Sidebar";
import { NotificationsBell } from "@/components/shell/NotificationsBell";
import { OrgSwitcher } from "@/components/shell/OrgSwitcher";
import { ProfileMenu } from "@/components/shell/ProfileMenu";

/** Grove: white sidebar, a slim row (organization, bell, avatar), then pages open with the green hero band. */
export function GroveShell({ session, children }) {
  return (
    <div className="min-h-screen p-6 max-[1100px]:p-3">
      <div className="flex min-h-[calc(100vh-48px)] w-full overflow-hidden" style={{ background: "var(--shell-bg)", borderRadius: "var(--shell-radius)" }}>
        <Sidebar session={session} />
        <div className="min-w-0 flex-1 p-10 max-[1100px]:p-6">
          <div className="mb-4 flex items-center justify-end gap-2.5">
            <OrgSwitcher orgName={session.orgName} />
            <NotificationsBell />
            <ProfileMenu name={session.name} email={session.email} size={36} className="!bg-[#c2410c] !text-white" />
          </div>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
