import { cn } from "./cn";

/** Loading placeholder in the shape of the content. Show it only after 300ms. */
export function Skeleton({ className, ...rest }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-subtle-2", className)} {...rest} />;
}
