"use client";
import { Check } from "lucide-react";
import { roleCounts } from "@/features/team/filters";
import { AccessGrid } from "@/features/team/ui/AccessGrid";

/** Pastel App access: the matrix is the page. Tiles, a legend, the grid, bulk bar and Undo. */
export function PastelAccess({ data, viewer }) {
  const { members, seats, appUsage, timezone } = data;
  const c = roleCounts(members);
  const tiles = [
    { label: "People", n: c.all, bg: "#fff" },
    { label: "Owner & admins", n: (c.OWNER ?? 0) + (c.ADMIN ?? 0), bg: "var(--role-owner)" },
    { label: "Managers", n: c.MANAGER ?? 0, bg: "var(--role-manager)" },
    { label: "Accountants", n: c.ACCOUNTANT ?? 0, bg: "var(--role-accountant)" },
    { label: "Members", n: c.MEMBER ?? 0, bg: "var(--role-member)" },
    { label: "Clients", n: c.CLIENT ?? 0, bg: "var(--role-client)" },
    { label: "Seats left", n: seats.left, bg: "#111", color: "#fff" },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-7 gap-3 max-[1100px]:grid-cols-4">
        {tiles.map((t) => <div key={t.label} className="rounded-[22px] p-4" style={{ background: t.bg, color: t.color ?? "var(--ink)" }}><span className="tabular block text-[32px] leading-none">{t.n}</span><span className="mt-2 block text-sm">{t.label}</span></div>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-muted">
        <p>Who can open which app. Tap a circle to give or remove access. The owner always has every app.</p>
        <ul className="flex items-center gap-4 text-sm" aria-label="Legend">
          <li className="flex items-center gap-2"><span className="inline-flex size-6 items-center justify-center rounded-full" style={{ background: "var(--role-accountant)" }}><Check size={14} aria-hidden /></span>Has access</li>
          <li className="flex items-center gap-2"><span className="inline-flex size-6 rounded-full border border-dashed border-muted/60" />No access</li>
          <li className="flex items-center gap-2"><span className="inline-flex size-6 items-center justify-center rounded-full bg-black text-white"><Check size={14} aria-hidden /></span>Always on</li>
        </ul>
      </div>
      <AccessGrid members={members} viewer={viewer} timezone={timezone} appUsage={appUsage} seatLimit={seats.limit} variant="circles" />
    </div>
  );
}
