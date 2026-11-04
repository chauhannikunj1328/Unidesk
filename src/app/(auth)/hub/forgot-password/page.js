import { ForgotForm } from "@/features/auth/ui/PasswordForms";
import { AuthTitle } from "@/features/auth/ui/bits";

export const metadata = { title: "Reset your password · Unidesk" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthTitle text="Enter your email and we'll send you a link to choose a new password.">Reset your password</AuthTitle>
      <ForgotForm />
    </>
  );
}
