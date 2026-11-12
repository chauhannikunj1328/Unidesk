import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/session";
import { getTheme } from "@/lib/theme";
import { getTeam } from "@/features/team/queries";
import { getSharedData } from "@/features/team/shared-data";
import { canSeeAccessTab, canSeeSharedDataTab } from "@/features/team/permissions";
import { InviteButton, InviteHost } from "@/features/team/ui/InviteDrawer";
import { teamTabs } from "@/features/team/ui/tabs";
import { ThemePageHeader } from "@/components/shell/ThemePageHeader";
import { GlassSharedData } from "@/themes/glass/team/GlassSharedData";
import { PastelSharedData } from "@/themes/pastel/team/PastelSharedData";
import { GroveSharedData } from "@/themes/grove/team/GroveSharedData";

export const metadata = { title: "Shared data · Unidesk" };

const SCREENS = { glass: GlassSharedData, pastel: PastelSharedData, grove: GroveSharedData };

/** Team > Shared data: which apps may read contacts, clients and projects (flow 09). Owners and admins only. */
export default async function TeamSharedDataPage() {
  const [session, theme] = await Promise.all([requireSession(), getTheme()]);
  const viewer = { membershipId: session.membershipId, role: session.role };
  if (!canSeeSharedDataTab(viewer)) notFound();
  const [team, shared] = await Promise.all([getTeam(session), getSharedData(session)]);
  const Screen = SCREENS[theme];
  const active = team.members.filter((m) => m.status === "active").length;
  const invited = team.members.filter((m) => m.status === "invited").length;

  return (
    <>
      <ThemePageHeader
        eyebrow="Organization"
        title={theme === "grove" ? "Shared data" : "Team"}
        summary={`${team.members.length} people · ${team.seats.left} seats left`}
        description="Which apps can read your contacts, clients and projects."
        chips={[{ label: `${active} active`, dot: "#a6c64a" }, ...(invited ? [{ label: `${invited} invite pending`, dot: "#f2b94b" }] : []), { label: `${team.seats.used} of ${team.seats.limit} seats` }]}
        tabs={teamTabs({ theme, viewer, team, canAccess: canSeeAccessTab(viewer) })}
        actions={<InviteButton role={session.role} variant={theme === "grove" ? "secondary" : "primary"} />}
        user={session}
        timezone={team.timezone}
      />
      <Suspense fallback={null}>
        <Screen data={shared} />
        <InviteHost data={team} viewer={viewer} />
      </Suspense>
    </>
  );
}
