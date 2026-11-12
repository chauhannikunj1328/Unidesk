import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/session";
import { getTheme } from "@/lib/theme";
import { getTeam } from "@/features/team/queries";
import { roleHeadcount } from "@/features/team/roles-rules";
import { canSeeAccessTab } from "@/features/team/permissions";
import { InviteButton, InviteHost } from "@/features/team/ui/InviteDrawer";
import { teamTabs } from "@/features/team/ui/tabs";
import { ThemePageHeader } from "@/components/shell/ThemePageHeader";
import { GlassRoles } from "@/themes/glass/team/GlassRoles";
import { GroveRoles } from "@/themes/grove/team/GroveRoles";

export const metadata = { title: "Roles · Unidesk" };

/** Team > Roles and permissions (read-only). Pastel shows it as a drawer on the People page, so this route sends it there. */
export default async function TeamRolesPage() {
  const [session, theme] = await Promise.all([requireSession(), getTheme()]);
  if (theme === "pastel") redirect("/hub/team?roles=1");
  const viewer = { membershipId: session.membershipId, role: session.role };
  const team = await getTeam(session);
  const counts = roleHeadcount(team.members);
  const Screen = theme === "grove" ? GroveRoles : GlassRoles;
  const active = team.members.filter((m) => m.status === "active").length;
  const invited = team.members.filter((m) => m.status === "invited").length;

  return (
    <>
      <ThemePageHeader
        eyebrow="Organization"
        title={theme === "grove" ? "Roles" : "Team"}
        summary={`${team.members.length} people · ${team.seats.left} seats left`}
        description="What each role can do in your organization."
        chips={[{ label: `${active} active`, dot: "#a6c64a" }, ...(invited ? [{ label: `${invited} invite pending`, dot: "#f2b94b" }] : []), { label: `${team.seats.used} of ${team.seats.limit} seats` }]}
        tabs={teamTabs({ theme, viewer, team, canAccess: canSeeAccessTab(viewer) })}
        actions={<InviteButton role={session.role} variant={theme === "grove" ? "secondary" : "primary"} />}
        user={session}
        timezone={team.timezone}
      />
      <Suspense fallback={null}>
        <Screen counts={counts} yourRole={session.role} />
        <InviteHost data={team} viewer={viewer} />
      </Suspense>
    </>
  );
}
