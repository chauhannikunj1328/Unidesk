import { Check } from "lucide-react";
import { cn } from "./cn";

/** Numbered steps. The count shown matches the real number of steps. */
export function Stepper({ steps, current }) {
  return (
    <ol className="flex items-center gap-3" aria-label="Progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="flex items-center gap-2">
            <span className={cn("inline-flex size-7 items-center justify-center rounded-full text-xs font-medium", done || active ? "bg-primary text-on-primary" : "bg-subtle text-muted")}>
              {done ? <Check size={14} strokeWidth={1.75} aria-hidden /> : i + 1}
            </span>
            <span className={cn("text-sm", active ? "text-ink font-medium" : "text-muted")}>{label}</span>
            {i < steps.length - 1 ? <span aria-hidden className="mx-1 h-px w-8 bg-line" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
