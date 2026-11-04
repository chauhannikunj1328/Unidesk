import Link from "next/link";
import { AuthTitle } from "@/features/auth/ui/bits";

export const metadata = { title: "Terms of Service · Unidesk" };

/** Draft placeholder. The real text needs legal review before launch (Build Docs, decision 4). */
export default function Page() {
  return (
    <>
      <AuthTitle text="This is a draft placeholder. The final text will be reviewed by a lawyer before Unidesk launches.">Terms of Service</AuthTitle>
      <Link href="/hub/sign-up" className="font-medium text-ink underline underline-offset-2">Back to sign up</Link>
    </>
  );
}
