import { notFound } from "next/navigation";
import { requireSession } from "@/server/session";
import { getTheme } from "@/lib/theme";
import { getTeam } from "@/features/team/queries";
import { ThemePageHeader } from "@/components/shell/ThemePageHeader";
import { TransferOwnershipForm } from "@/features/team/ui/TransferOwnershipForm";

export const metadata = { title: "Transfer ownership · Unidesk" };

/** Hand ownership to an Admin (Hub flow 10). Only the owner sees this page. */
export default async function OwnershipPage({ searchParams }) {
  const [session, theme, sp] = await Promise.all([requireSession(), getTheme(), searchParams]);
  if (session.role !== "OWNER") notFound();
  const team = await getTeam(session);
  const admins = team.members.filter((m) => m.role === "ADMIN" && m.status === "active").map((m) => ({ id: m.id, name: m.name, email: m.email }));

  return (
    <>
      <ThemePageHeader
        eyebrow="Settings"
        title={theme === "grove" ? "Transfer ownership" : "Ownership"}
        description="Move ownership of the organization to one of your Admins."
        user={session}
        timezone={team.timezone}
      />
      <section aria-label="Transfer ownership" className="bg-card p-8" style={{ borderRadius: "var(--card-radius)", border: theme === "glass" ? "var(--card-border)" : undefined }}>
        <TransferOwnershipForm admins={admins} defaultTo={typeof sp.to === "string" ? sp.to : ""} ownerName={session.name} />
      </section>
    </>
  );
}
