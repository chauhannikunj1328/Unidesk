import { cn } from "./cn";

const COLORS = ["#E8D5F5", "#D5E8F5", "#D5F5E3", "#F5E8D5", "#F5D5DC", "#E3F5D5", "#F5F0D5"];

/** Stable colour from the name so a person always looks the same. */
function colorFor(name = "") {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

export function Avatar({ name, src, size = 32, className }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium text-ink select-none", className)}
      style={{ width: size, height: size, background: colorFor(name), fontSize: size * 0.38 }}
      title={name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- avatars come from many hosts */}
      {src ? <img src={src} alt={name} className="size-full object-cover" /> : <span aria-label={name}>{initials(name)}</span>}
    </span>
  );
}

export function AvatarStack({ people, max = 3, size = 28 }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="inline-flex items-center">
      {shown.map((p, i) => (
        <Avatar key={p.name + i} name={p.name} src={p.src} size={size} className={cn("ring-2 ring-white", i > 0 && "-ml-2")} />
      ))}
      {extra > 0 ? (
        <span className="-ml-2 inline-flex items-center justify-center rounded-full bg-subtle text-xs ring-2 ring-white" style={{ width: size, height: size }}>
          +{extra}
        </span>
      ) : null}
    </span>
  );
}
