import { getPendingEmail } from "@/server/pending";
import { resendWaitSeconds } from "@/server/auth-flow";
import { VerifyPanel } from "@/features/auth/ui/VerifyPanel";

export const metadata = { title: "Check your inbox · Unidesk" };

export default async function VerifyEmailPage({ searchParams }) {
  const sp = await searchParams;
  const email = await getPendingEmail();
  const wait = email ? await resendWaitSeconds(email) : 0;
  const status = sp.status === "expired" || sp.status === "invalid" ? sp.status : null;
  return <VerifyPanel email={email} status={status} wait={wait} />;
}
