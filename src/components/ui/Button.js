import { Loader2 } from "lucide-react";
import { cn } from "./cn";

const VARIANTS = {
  primary: "bg-primary text-on-primary border border-transparent hover:opacity-90",
  secondary: "bg-secondary text-on-secondary border border-[var(--secondary-border)] hover:bg-subtle",
  ghost: "bg-transparent text-ink border border-transparent hover:bg-subtle",
  danger: "bg-transparent text-danger border border-danger hover:bg-danger-soft",
  "on-image": "bg-white/15 text-white border border-white/40 hover:bg-white/25",
};
const SIZES = { sm: "h-[var(--btn-h-sm)] px-3 text-[12.5px] gap-1.5", md: "h-[var(--btn-h)] px-3.5 text-[13px] gap-1.5" };

/**
 * @param {{ variant?: "primary"|"secondary"|"ghost"|"danger"|"on-image", size?: "sm"|"md", icon?: import("react").ElementType, loading?: boolean } & import("react").ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export function Button({ variant = "secondary", size = "md", icon: Icon, loading, disabled, className, children, type = "button", ...rest }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors duration-150 ease-out disabled:opacity-50 disabled:pointer-events-none",
        "rounded-[var(--primary-radius)]",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 size={15} strokeWidth={1.75} className="animate-spin" aria-hidden /> : Icon ? <Icon size={15} strokeWidth={1.75} aria-hidden /> : null}
      {children}
    </button>
  );
}
