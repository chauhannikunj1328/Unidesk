"use client";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function InvitesError({ reset }) {
  return <EmptyState title="We couldn't load the invites" text="Check your connection and try again." action={<Button onClick={reset}>Try again</Button>} />;
}
