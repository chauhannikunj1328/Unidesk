import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import { checkVerifyToken } from "@/server/auth-flow";
import { confirmEmailAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Confirm your email · Unidesk" };

/**
 * The page the emailed link opens. Looking at it changes nothing: the link is only used when the person presses the button,
 * so email scanners that open every link cannot use it up before the person gets there.
 */
export default async function ConfirmEmailPage({ searchParams }) {
  const { token } = await searchParams;
  const check = await checkVerifyToken(token);
  if (check.status !== "ok") redirect(`/hub/verify-email?status=${check.status === "expired" ? "expired" : "invalid"}`);
  return (
    <div className="flex flex-col items-center text-center">
      <span className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-subtle text-muted"><MailCheck size={32} strokeWidth={1.5} aria-hidden /></span>
      <h1 className="auth-title font-display-theme">Confirm your email</h1>
      <p className="mt-2 text-text">One more tap to finish creating your account and set up your organization.</p>
      <form action={confirmEmailAction} className="mt-6 w-full">
        <input type="hidden" name="token" value={token} />
        <Button type="submit" variant="primary" className="w-full">Confirm my email</Button>
      </form>
    </div>
  );
}
