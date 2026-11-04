"use client";
import { ChevronsUpDown } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

/** One organization for now. Becomes a menu when a person belongs to several (Hub flow 25). */
export function OrgSwitcher({ orgName }) {
  return (
    <div className="inline-flex h-9 items-center gap-2 rounded-[var(--control-radius)] border border-line bg-input pl-1.5 pr-3 text-sm text-ink" title={orgName}>
      <Avatar name={orgName} size={24} />
      <span className="max-w-[160px] truncate">{orgName}</span>
      <ChevronsUpDown size={14} strokeWidth={1.75} aria-hidden className="text-muted" />
    </div>
  );
}
