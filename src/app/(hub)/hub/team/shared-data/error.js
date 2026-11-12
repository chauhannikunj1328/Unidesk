"use client";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function SharedDataError({ reset }) {
  return <EmptyState title="We couldn't load shared data" text="Check your connection and try again." action={<Button onClick={reset}>Try again</Button>} />;
}
