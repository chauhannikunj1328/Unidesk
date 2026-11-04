import { cn } from "./cn";

/** Card surface. Title uses the display font (serif in glass). */
export function Card({ className, children, ...rest }) {
  return (
    <div className={cn("bg-card p-6", className)} style={{ borderRadius: "var(--card-radius)", border: "var(--card-border)" }} {...rest}>
      {children}
    </div>
  );
}

export function Section({ title, description, actions, children, className }) {
  return (
    <Card className={className}>
      {title || actions ? (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title ? <h2 className="font-display-theme text-[22px] leading-tight">{title}</h2> : null}
            {description ? <p className="mt-1 text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </Card>
  );
}
