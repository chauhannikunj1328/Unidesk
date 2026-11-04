import clsx from "clsx";

/** Join class names, skipping falsy values. */
export function cn(...parts) {
  return clsx(parts);
}
