import { redirect } from "next/navigation";
import { getIdentity } from "@/server/session";
import { AuthTitle, SignOutButton } from "@/features/auth/ui/bits";

export const metadata = { title: "Client portal · Unidesk" };

/** Placeholder until the client portal is specified and built (see the Hub README, open question 1). */
export default async function PortalPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/hub/sign-in?next=/portal");
  return (
    <>
      <AuthTitle text="Your documents, proposals, agreements and invoices will appear here.">Client portal</AuthTitle>
      <SignOutButton />
    </>
  );
}
