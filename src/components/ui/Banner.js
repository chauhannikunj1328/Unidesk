"use client";
import { useState } from "react";
import { CircleAlert, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "./cn";

const KINDS = {
  info: { cls: "bg-accent-soft text-on-accent-soft", icon: Info },
  warning: { cls: "bg-warning-soft text-warning", icon: TriangleAlert },
  danger: { cls: "bg-danger-soft text-danger", icon: CircleAlert },
};

/** "Needs attention" message. Dismissible when `dismissible`. */
export function Banner({ kind = "info", dismissible, children }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  const { cls, icon: Icon } = KINDS[kind];
  return (
    <div role="status" className={cn("flex items-start gap-3 rounded-[var(--control-radius)] px-4 py-3", cls)} style={{ borderRadius: "16px" }}>
      <Icon size={18} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0" />
      <div className="flex-1">{children}</div>
      {dismissible ? (
        <button type="button" aria-label="Dismiss" onClick={() => setHidden(true)}>
          <X size={16} strokeWidth={1.75} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
