"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
  useEffect(() => setValue(initial ?? ""), [initial]);
  const change = (v) => {
    setValue(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onCommit(v), delay);
  };
  return [value, change];
}
