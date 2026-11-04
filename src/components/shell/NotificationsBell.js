"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, Inbox } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

/** Opens a small panel. There are no notifications until the flows that send them are built, so it says so. */
export function NotificationsBell({ variant = "outline" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <IconButton icon={Bell} label="Notifications" variant={variant} onClick={() => setOpen((o) => !o)} aria-expanded={open} />
      {open ? (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 z-40 mt-2 w-72 bg-card p-5 text-center" style={{ borderRadius: "20px", border: "var(--card-border)", boxShadow: "var(--shadow-float)" }}>
          <span className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-full bg-subtle text-muted"><Inbox size={24} strokeWidth={1.5} aria-hidden /></span>
          <p className="font-medium text-ink">You&apos;re all caught up</p>
          <p className="mt-1 text-muted">New invites, access changes and mentions will show up here.</p>
        </div>
      ) : null}
    </div>
  );
}
