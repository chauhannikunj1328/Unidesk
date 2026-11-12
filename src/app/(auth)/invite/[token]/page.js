import Link from "next/link";
import { CircleAlert, Clock3, MailX } from "lucide-react";
import { getIdentity } from "@/server/session";
import { getInviteInfo } from "@/features/team/accept";
import { acceptSignedInAction } from "@/features/team/invite-actions";
import { AcceptInviteForm } from "@/features/team/ui/AcceptInviteForm";
import { AuthFooter, AuthLink, SignOutButton } from "@/features/auth/ui/bits";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Join your team · Unidesk" };

/** Message-only states: no form, one clear next step. */
function Notice({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-subtle text-muted"><Icon size={32} strokeWidth={1.5} aria-hidden /></span>
      <h1 className="auth-title font-display-theme">{title}</h1>
      <div className="mt-2 text-text">{children}</div>
    </div>
  );
}

/** Accept invite (P9 public). The invite link is the proof; the page works signed out. */
export default async function InvitePage({ params }) {
  const { token } = await params;
  const [info, identity] = await Promise.all([getInviteInfo(token), getIdentity()]);

  if (info.status === "invalid") return <Notice icon={MailX} title="This invite link isn't valid"><p>Check that you opened the whole link from the email, or ask your teammate to send a new invite.</p></Notice>;
  if (info.status === "revoked") return <Notice icon={MailX} title="This invite is no longer valid"><p>It was taken back or replaced. Ask {info.inviterName} for a new one.</p></Notice>;
  if (info.status === "expired") return <Notice icon={Clock3} title="This invite has expired"><p>Ask {info.inviterName} to send a new one. Invites work for 7 days.</p></Notice>;
  if (info.status === "accepted") {
    return (
      <Notice icon={CircleAlert} title={`You've already joined ${info.orgName}`}>
        <p className="mb-5">This invite was already used.</p>
        <Link href="/hub/sign-in" className="inline-flex"><Button variant="primary">Sign in</Button></Link>
      </Notice>
    );
  }

  const heading = (
    <div className="mb-6">
      <p className="mb-1 text-sm font-medium text-muted">{info.orgName}</p>
      <h1 className="auth-title font-display-theme">{info.inviterName} invited you to join as {/^[AEIOU]/.test(info.role) ? "an" : "a"} {info.role}</h1>
      <p className="mt-2 text-text">Invited as {info.email}</p>
      {info.note ? <blockquote className="mt-4 rounded-[16px] bg-subtle px-4 py-3 text-sm text-text">&ldquo;{info.note}&rdquo;</blockquote> : null}
    </div>
  );

  if (!info.hasAccount) {
    return (
      <>
        {heading}
        <AcceptInviteForm token={token} defaultName={info.name} orgName={info.orgName} />
        <AuthFooter>Already have an account? <AuthLink href={`/hub/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`}>Sign in</AuthLink></AuthFooter>
      </>
    );
  }

  // The invited email already has an account.
  const mine = identity?.user.email.toLowerCase() === info.email;
  if (mine) {
    return (
      <>
        {heading}
        <form action={acceptSignedInAction}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit" variant="primary" className="w-full">Accept invite</Button>
        </form>
      </>
    );
  }
  return (
    <>
      {heading}
      {identity ? (
        <div className="flex flex-col gap-3">
          <p className="text-text">You&apos;re signed in as {identity.user.email}. This invite is for {info.email}.</p>
          <SignOutButton variant="primary">Sign out and continue</SignOutButton>
        </div>
      ) : (
        <>
          <p className="mb-4 text-text">Sign in as {info.email} to accept.</p>
          <Link href={`/hub/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`} className="block"><Button variant="primary" className="w-full">Sign in to accept</Button></Link>
        </>
      )}
    </>
  );
}
