import { Skeleton } from "@/components/ui/Skeleton";

/** Skeleton in the shape of the page, never a blank screen. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading team" className="flex flex-col gap-6">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-[22px]" />)}</div>
      <Skeleton className="h-[420px] rounded-[22px]" />
    </div>
  );
}
