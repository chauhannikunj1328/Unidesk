"use client";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

/** The error state of the Team list: what went wrong in plain words, and Retry (04-team-people-list.md). */
export default function TeamError({ reset }) {
  return (
    <Card>
      <EmptyState
        icon={TriangleAlert}
        title="We couldn't load your team"
        text="Check your connection and try again."
        action={<Button variant="primary" onClick={() => reset()}>Retry</Button>}
      />
    </Card>
  );
}
