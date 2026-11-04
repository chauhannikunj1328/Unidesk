import { redirect } from "next/navigation";
import { landingIdentity } from "@/server/session";
import { landingFor } from "@/lib/landing";
import { SignUpForm } from "@/features/auth/ui/SignUpForm";
import { AuthTitle } from "@/features/auth/ui/bits";

export const metadata = { title: "Start your free trial · Unidesk" };

export default async function SignUpPage({ searchParams }) {
  const sp = await searchParams;
  const id = await landingIdentity();
  if (id) redirect(landingFor(id));
  const ref = typeof sp.ref === "string" && /^[A-Za-z0-9-]{3,32}$/.test(sp.ref) ? sp.ref.toUpperCase() : undefined;
  return (
    <>
      <AuthTitle text="30 days free. No card needed.">Start your free trial</AuthTitle>
      <SignUpForm referral={ref} />
    </>
  );
}
