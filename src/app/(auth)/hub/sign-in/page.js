import { redirect } from "next/navigation";
import { landingIdentity } from "@/server/session";
import { landingFor } from "@/lib/landing";
import { SignInForm } from "@/features/auth/ui/SignInForm";
import { AuthTitle, FlashToast } from "@/features/auth/ui/bits";

export const metadata = { title: "Sign in · Unidesk" };

export default async function SignInPage({ searchParams }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const id = await landingIdentity();
  if (id) redirect(landingFor(id, next)); // already signed in: go where they were headed
  const flash = sp.signedout ? "You're signed out" : sp.reset ? "Password saved. Sign in with your new password." : null;
  return (
    <>
      <FlashToast message={flash} />
      <AuthTitle>Sign in to Unidesk</AuthTitle>
      <SignInForm next={next} />
    </>
  );
}
