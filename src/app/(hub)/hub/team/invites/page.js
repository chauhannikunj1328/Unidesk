import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/session";
import { getTheme } from "@/lib/theme";
import { getTeam } from "@/features/team/queries";
import { getInvites } from "@/features/team/invites";
import { canSeeAccessTab, canSeeInvitesTab } from "@/features/team/permissions";
import { InviteButton, InviteHost } from "@/features/team/ui/InviteDrawer";
import { teamTabs } from "@/features/team/ui/tabs";
import { ThemePageHeader } from "@/components/shell/ThemePageHeader";
import { GlassInvites } from "@/themes/glass/team/GlassInvites";
import { PastelInvites } from "@/themes/pastel/team/PastelInvites";
import { GroveInvites } from "@/themes/grove/team/GroveInvites";

export const metadata = { title: "Invites · Unidesk" };

const SCREENS = { glass: GlassInvites, pastel: PastelInvites, grove: GroveInvites };

/** Team > Invites: follow up on people who have not joined yet (flow 08). */
export default async function TeamInvitesPage() {
  const [session, theme] = await Promise.all([requireSession(), getTheme()]);
  const viewer = { membershipId: session.membershipId, role: session.role };
  if (!canSeeInvitesTab(viewer)) notFound();
  const [team, invites] = await Promise.all([getTeam(session), getInvites(session)]);
  const Screen = SCREENS[theme];
  const active = team.members.filter((m) => m.status === "active").length;

  return (
    <>
      <ThemePageHeader
        eyebrow="Organization"
        title={theme === "grove" ? "Invites" : "Team"}
        summary={`${team.members.length} people · ${team.seats.left} seats left`}
        description="People you invited who haven't joined yet. Resend, change or revoke each invite."
        chips={[{ label: `${active} active`, dot: "#a6c64a" }, ...(invites.pending ? [{ label: `${invites.pending} invite pending`, dot: "#f2b94b" }] : []), { label: `${team.seats.used} of ${team.seats.limit} seats` }]}
        tabs={teamTabs({ theme, viewer, team, canAccess: canSeeAccessTab(viewer) })}
        actions={<InviteButton role={session.role} variant={theme === "grove" ? "secondary" : "primary"} />}
        user={session}
        timezone={team.timezone}
      />
      <Suspense fallback={null}>
        <Screen data={invites} viewer={viewer} />
        <InviteHost data={team} viewer={viewer} />
      </Suspense>
    </>
  );
}
