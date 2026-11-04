"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { shouldTakeFromUrl } from "@/lib/typing";

/** URL state for Team lists: ?id=, ?role=, ?status=, ?group=, ?q=. Reloading or sharing the link keeps the view. */
export function useTeamParams() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const params = Object.fromEntries(sp.entries());

  const set = useCallback(
    (patch) => {
      const next = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );
  return { params, set };
}

/** Search text that waits 250ms after typing stops before it touches the URL. */
export function useDebouncedQuery(initial, onCommit, delay = 250) {
  const [value, setValue] = useState(initial ?? "");
  const timer = useRef(null);
  const lastKey = useRef(0);
  // Take the value from the URL when it changes from elsewhere (back button, "Clear filters"), but not as an echo of what
  // was just typed: the URL catches up a moment later and would otherwise erase the letters typed since.
  useEffect(() => {
    if (!shouldTakeFromUrl(lastKey.current)) return;
    setValue(initial ?? "");
  }, [initial]);
  const change = (v) => {
    lastKey.current = Date.now();
    setValue(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onCommit(v), delay);
  };
  return [value, change];
}
