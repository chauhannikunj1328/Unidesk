"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setThemeAction } from "@/app/actions";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/components/ui/cn";

const THEMES = [
  { id: "glass", label: "Warm glass", swatch: "linear-gradient(135deg,#8c97ae,#c9a27a)" },
  { id: "pastel", label: "Pastel", swatch: "linear-gradient(135deg,#efc8ee,#f2dc1f)" },
  { id: "grove", label: "Green grove", swatch: "linear-gradient(135deg,#3d5a14,#b7c95a)" },
];

/**
 * Pilot-only floating switcher so all three structures can be compared on one page.
 * The real control is Profile > Appearance (Hub flow 24). Hidden in production.
 */
export function DevThemeSwitcher() {
  const router = useRouter();
  const current = useTheme();
  const [pending, start] = useTransition();
  if (process.env.NODE_ENV === "production") return null;
  function pick(id) {
    start(async () => { await setThemeAction(id); router.refresh(); });
  }
  return (
    <div role="group" aria-label="Appearance" className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 shadow-lg ring-1 ring-black/10 backdrop-blur">
      <span className="text-xs text-muted">Theme</span>
      {THEMES.map((t) => (
        <button key={t.id} type="button" disabled={pending} onClick={() => pick(t.id)} aria-label={t.label} aria-pressed={current === t.id} title={t.label} className={cn("size-6 rounded-full ring-1 ring-black/10", current === t.id && "ring-2 ring-ink")} style={{ background: t.swatch }} />
      ))}
    </div>
  );
}
