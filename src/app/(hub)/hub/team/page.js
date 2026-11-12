import { Suspense } from "react";
import { requireSession } from "@/server/session";
import { getTheme } from "@/lib/theme";
import { getTeam } from "@/features/team/queries";
import { canSeeAccessTab } from "@/features/team/permissions";
import { InviteButton, InviteHost } from "@/features/team/ui/InviteDrawer";
import { greetingFor } from "@/lib/dates";
import { RolesDrawerHost, RolesPill } from "@/features/team/ui/RolesDrawer";
import { roleHeadcount } from "@/features/team/roles-rules";
import { teamTabs } from "@/features/team/ui/tabs";
import { ThemePageHeader } from "@/components/shell/ThemePageHeader";
import { GlassTeam } from "@/themes/glass/team/GlassTeam";
import { PastelTeam } from "@/themes/pastel/team/PastelTeam";
import { GroveTeam } from "@/themes/grove/team/GroveTeam";

export const metadata = { title: "Team · Unidesk" };

const SCREENS = { glass: GlassTeam, pastel: PastelTeam, grove: GroveTeam };

/** Team > People. One set of data; each theme decides how to show it (12-Theme-Pattern-Language.md). */
export default async function TeamPage() {
  const [session, theme] = await Promise.all([requireSession(), getTheme()]);
  const data = await getTeam(session);
  const viewer = { membershipId: session.membershipId, role: session.role };
  const Screen = SCREENS[theme];

  const tabs = teamTabs({ theme, viewer, team: data, canAccess: canSeeAccessTab(viewer) });
  const active = data.members.filter((m) => m.status === "active").length;
  const invited = data.members.filter((m) => m.status === "invited").length;

  return (
    <>
      <ThemePageHeader
        eyebrow="Organization"
        title={theme === "grove" ? "Your team" : "Team"}
        summary={`${data.members.length} people · ${data.seats.left} seats left`}
        description="Invite people, choose their role and which apps they can open. Everyone reports to the person who invited them."
        chips={[{ label: `${active} active`, dot: "#a6c64a" }, ...(invited ? [{ label: `${invited} invite pending`, dot: "#f2b94b" }] : []), { label: `${data.seats.used} of ${data.seats.limit} seats` }]}
        tabs={tabs}
        actions={<>{theme === "pastel" ? <RolesPill /> : null}<InviteButton role={session.role} variant={theme === "grove" ? "secondary" : "primary"} /></>}
        greeting={theme === "grove" ? greetingFor(session.name, data.timezone) : undefined}
        user={session}
        timezone={data.timezone}
      />
      <Suspense fallback={null}>
        <Screen data={data} viewer={viewer} />
        <InviteHost data={data} viewer={viewer} />
        {theme === "pastel" ? <RolesDrawerHost counts={roleHeadcount(data.members)} yourRole={session.role} /> : null}
      </Suspense>
    </>
  );
}
