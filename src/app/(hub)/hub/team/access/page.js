import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/server/session";
import { getTheme } from "@/lib/theme";
import { getTeam } from "@/features/team/queries";
import { canSeeAccessTab } from "@/features/team/permissions";
import { teamTabs } from "@/features/team/ui/tabs";
import { ThemePageHeader } from "@/components/shell/ThemePageHeader";
import { PastelAccess } from "@/themes/pastel/team/PastelAccess";
import { GroveAccess } from "@/themes/grove/team/GroveAccess";

export const metadata = { title: "App access · Unidesk" };

/** Team > App access. Pastel: the matrix. Grove: toggle table. Glass: folded into each person's panel, so it redirects there. */
export default async function TeamAccessPage() {
  const [session, theme] = await Promise.all([requireSession(), getTheme()]);
  const viewer = { membershipId: session.membershipId, role: session.role };
  if (!canSeeAccessTab(viewer)) notFound();
  const data = await getTeam(session);

  if (theme === "glass") {
    const first = data.members.find((m) => m.role !== "OWNER") ?? data.members[0];
    redirect(`/hub/team?id=${first.id}#access`);
  }

  const Screen = theme === "pastel" ? PastelAccess : GroveAccess;
  const active = data.members.filter((m) => m.status === "active").length;
  const invited = data.members.filter((m) => m.status === "invited").length;
  return (
    <>
      <ThemePageHeader
        eyebrow="Organization"
        title={theme === "grove" ? "App access" : "Team"}
        description="Who can open which app. Changes save right away and are recorded in the audit log."
        chips={[{ label: `${active} active`, dot: "#a6c64a" }, ...(invited ? [{ label: `${invited} invite pending`, dot: "#f2b94b" }] : []), { label: `${data.seats.used} of ${data.seats.limit} seats` }]}
        tabs={teamTabs({ theme, viewer, team: data, canAccess: true })}
        user={session}
        timezone={data.timezone}
      />
      <Suspense fallback={null}>
        <Screen data={data} viewer={viewer} />
      </Suspense>
    </>
  );
}
