import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/server/session";
import { ThemePageHeader } from "@/components/shell/ThemePageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Dashboard · Unidesk" };

export default async function HubDashboardPage() {
  const session = await getSession();
  return (
    <>
      <ThemePageHeader eyebrow="Organization" title="Dashboard" summary={session.orgName} description="The Hub dashboard is built in Phase 1, flow 03." user={session} timezone={session.timezone} />
      <Card>
        <EmptyState icon={LayoutDashboard} title="Dashboard comes next" text="Team is the first page built, in all three themes. Switch themes with the control at the bottom right." action={<Link href="/hub/team"><Button variant="primary">Open Team</Button></Link>} />
      </Card>
    </>
  );
}
