import { X } from "lucide-react";
import { cn } from "./cn";

const TONES = {
  neutral: "bg-subtle text-text",
  accent: "bg-accent-soft text-on-accent-soft",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

const APP_DOTS = {
  Proposals: "var(--app-proposals)",
  Appointment: "var(--app-appointment)",
  CRM: "var(--app-crm)",
  Workdrive: "var(--app-workdrive)",
  SOP: "var(--app-sop)",
  Invoicing: "var(--app-invoicing)",
  Accounting: "var(--app-accounting)",
};

/** Status always carries a word, never colour alone. */
export function Chip({ tone = "neutral", app, icon: Icon, dot, removable, onRemove, className, children }) {
  const dotColor = app ? APP_DOTS[app] : dot === true ? "currentColor" : dot;
  return (
    <span className={cn("inline-flex items-center gap-1.5 h-6 px-2.5 text-xs font-medium rounded-full", TONES[tone] ?? TONES.neutral, className)}>
      {dotColor ? <span aria-hidden className="size-1.5 rounded-full" style={{ background: dotColor }} /> : null}
      {Icon ? <Icon size={14} strokeWidth={1.75} aria-hidden /> : null}
      {children}
      {removable ? (
        <button type="button" aria-label="Remove" onClick={onRemove} className="-mr-1 rounded-full hover:bg-black/10">
          <X size={14} strokeWidth={1.75} aria-hidden />
        </button>
      ) : null}
    </span>
  );
}
