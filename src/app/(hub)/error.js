"use client";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

/** Fallback for any Hub page that has no error state of its own. The shell stays; only the page area shows the problem. */
export default function HubError({ reset }) {
  return (
    <Card>
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        text="We couldn't load this page. Check your connection and try again."
        action={<Button variant="primary" onClick={() => reset()}>Retry</Button>}
      />
    </Card>
  );
}
