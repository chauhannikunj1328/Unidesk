import { redirect } from "next/navigation";
import { ThemeShell } from "@/components/shell/ThemeShell";
import { getIdentity, getSession } from "@/server/session";
import { getTheme } from "@/lib/theme";

export default async function HubLayout({ children }) {
  const session = await getSession();
  if (!session) redirect((await getIdentity()) ? "/hub/onboarding?step=1" : "/hub/sign-in"); // signed out, or no organization yet
  if (session.role === "CLIENT") redirect("/portal"); // clients never see the Hub
  return <ThemeShell theme={await getTheme()} session={session}>{children}</ThemeShell>;
}
