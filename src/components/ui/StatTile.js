import Link from "next/link";
import { cn } from "./cn";

/** Headline number. With `href` it is a link to the list it counts. */
export function StatTile({ value, label, active, href }) {
  const body = (
    <>
      <div className="tabular font-display-theme text-4xl leading-none">{value}</div>
      <div className="mt-2 text-sm text-muted">{label}</div>
    </>
  );
  const cls = cn("block bg-card p-5 transition-shadow", active && "ring-2 ring-accent", href && "hover:shadow-md");
  const style = { borderRadius: "var(--card-radius)", border: "var(--card-border)" };
  return href ? (
    <Link href={href} className={cls} style={style}>{body}</Link>
  ) : (
    <div className={cls} style={style}>{body}</div>
  );
}
