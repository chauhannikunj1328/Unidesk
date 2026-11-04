import { cn } from "./cn";

const VARIANTS = {
  plain: "bg-transparent hover:bg-subtle border border-transparent",
  outline: "bg-secondary border border-[var(--secondary-border)] hover:bg-subtle",
  filled: "bg-primary text-on-primary border border-transparent hover:opacity-90",
};

/** `label` is required: it becomes the aria-label and the tooltip (an icon never stands alone). */
export function IconButton({ icon: Icon, label, variant = "plain", size = 32, className, type = "button", ...rest }) {
  if (!label) throw new Error("IconButton requires a label");
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex items-center justify-center text-ink transition-colors duration-150 disabled:opacity-50",
        // Round in pastel and grove, 14px radius in glass.
        "rounded-[var(--primary-radius)]",
        VARIANTS[variant],
        className
      )}
      {...rest}
    >
      <Icon size={15} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
