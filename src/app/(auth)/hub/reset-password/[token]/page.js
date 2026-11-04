import Link from "next/link";
import { checkResetToken } from "@/server/auth-flow";
import { ResetForm } from "@/features/auth/ui/PasswordForms";
import { AuthTitle } from "@/features/auth/ui/bits";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Choose a new password · Unidesk" };

export default async function ResetPasswordPage({ params }) {
  const { token } = await params;
  const check = await checkResetToken(token);
  if (check.status !== "ok") {
    return (
      <>
        <AuthTitle text="It may have been used already, or it expired. Links work for 1 hour and only once.">This reset link no longer works</AuthTitle>
        <Link href="/hub/forgot-password"><Button variant="primary" className="w-full">Send a new link</Button></Link>
      </>
    );
  }
  return (
    <>
      <AuthTitle>Choose a new password</AuthTitle>
      <ResetForm token={token} />
    </>
  );
}
