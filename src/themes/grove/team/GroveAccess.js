"use client";
import { AccessGrid } from "@/features/team/ui/AccessGrid";

/** Grove App access: a tab on the band with a table of green toggles and per-app counts. */
export function GroveAccess({ data, viewer }) {
  const { members, seats, appUsage, timezone } = data;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-text">Who can open which app. Switch a toggle to give or remove access. The owner always has every app.</p>
      <AccessGrid members={members} viewer={viewer} timezone={timezone} appUsage={appUsage} seatLimit={seats.limit} variant="toggles" barTone="green" />
    </div>
  );
}
