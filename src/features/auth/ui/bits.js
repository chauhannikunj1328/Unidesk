"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { signOutAction } from "../actions";

/** Fires one toast when a page opens with a flash message (signed out, password saved). */
export function FlashToast({ message }) {
  const toast = useToast();
  const shown = useRef(null);
  useEffect(() => {
    if (message && shown.current !== message) {
      shown.current = message; // once per message, even when React renders twice in development
      toast({ kind: "success", message });
    }
  }, [message]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function AuthTitle({ children, text }) {
  return (
    <div className="mb-6">
      <h1 className="auth-title font-display-theme">{children}</h1>
      {text ? <p className="mt-2 text-text">{text}</p> : null}
    </div>
  );
}

export function AuthFooter({ children }) {
  return <p className="mt-6 text-center text-sm text-text">{children}</p>;
}

export const AuthLink = ({ href, children }) => <Link href={href} className="font-medium text-ink underline underline-offset-2">{children}</Link>;

export function SignOutButton({ variant = "secondary", children = "Sign out" }) {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant={variant}>{children}</Button>
    </form>
  );
}

/** Wraps a server action so a network or server failure becomes the plain-words banner instead of a crash. */
export function withNetworkBanner(action) {
  return async (prev, formData) => {
    try {
      return await action(prev, formData);
    } catch (e) {
      if (typeof e?.digest === "string" && e.digest.startsWith("NEXT_REDIRECT")) throw e;
      return { banner: { kind: "danger", text: "We couldn't reach Unidesk. Check your connection and try again.", retry: true }, stamp: Date.now() };
    }
  };
}
