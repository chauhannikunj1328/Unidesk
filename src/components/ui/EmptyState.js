import { cn } from "./cn";

/** First use: icon, one sentence, one primary button. Filtered: say "No results" and offer Clear filters. */
export function EmptyState({ icon: Icon, title, text, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      {Icon ? (
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-subtle text-muted">
          <Icon size={32} strokeWidth={1.5} aria-hidden />
        </span>
      ) : null}
      <h3 className="font-display-theme text-xl">{title}</h3>
      {text ? <p className="max-w-[44ch] text-muted">{text}</p> : null}
      {action}
    </div>
  );
}
