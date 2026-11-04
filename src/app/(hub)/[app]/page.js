import { notFound } from "next/navigation";
import { Construction } from "lucide-react";
import { APP_LIST } from "@/lib/apps";
import { getSession } from "@/server/session";
import { getTheme } from "@/lib/theme";
import { ThemePageHeader } from "@/components/shell/ThemePageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export async function generateMetadata({ params }) {
  const { app: slug } = await params;
  const app = APP_LIST.find((a) => a.href === `/${slug}`);
  return { title: app ? `${app.label} · Unidesk` : "Unidesk" };
}

/** Placeholder so every app link in the shell lands on a real page. Replaced when the app is built. */
export default async function AppPlaceholderPage({ params }) {
  const { app: slug } = await params;
  const app = APP_LIST.find((a) => a.href === `/${slug}`);
  if (!app) notFound();
  const session = await getSession();
  if (session.role !== "OWNER" && !session.apps.includes(app.code)) notFound();
  await getTheme();
  return (
    <>
      <ThemePageHeader eyebrow="App" title={app.label} description={app.description} user={session} timezone={session.timezone} />
      <Card><EmptyState icon={Construction} title={`${app.label} is not built yet`} text="This app arrives in a later phase. Your access to it is already in place." /></Card>
    </>
  );
}
