import { redirect } from "next/navigation";
import { getIdentity, getSession } from "@/server/session";
import { AuthTitle, SignOutButton } from "@/features/auth/ui/bits";

export const metadata = { title: "Set up your organization · Unidesk" };

/** Placeholder until Hub flow 02 (the new organization wizard). */
export default async function OnboardingPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/hub/sign-in?next=/hub/onboarding");
  if (await getSession()) redirect("/hub");
  return (
    <>
      <AuthTitle text="Your email is confirmed. Creating your organization is the next step, and it arrives with the onboarding flow.">Welcome, {identity.user.name.split(" ")[0]}</AuthTitle>
      <SignOutButton />
    </>
  );
}
