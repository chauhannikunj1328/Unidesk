"use client";
import { SearchTrigger } from "@/components/shell/CommandPalette";
import { NotificationsBell } from "@/components/shell/NotificationsBell";
import { OrgSwitcher } from "@/components/shell/OrgSwitcher";
import { ProfileMenu } from "@/components/shell/ProfileMenu";

/** Pastel's top bar replacement: one floating rounded pill. Search is a round icon that opens the palette (⌘K). */
export function UtilityPill({ session }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white p-1.5 shadow-sm">
      <SearchTrigger variant="icon" />
      <OrgSwitcher orgName={session.orgName} />
      <NotificationsBell />
      <ProfileMenu name={session.name} email={session.email} size={36} className="!bg-[#e8822f] !text-white" />
    </div>
  );
}
