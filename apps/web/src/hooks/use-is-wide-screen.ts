"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Returns true when the viewport is at least `breakpoint` wide (default 1024px
 * = Tailwind `lg`).
 *
 * The server snapshot is `false` — narrow — deliberately. It has to guess, and
 * guessing narrow means a wide screen briefly shows the compact layout, while
 * guessing wide would flash a desktop layout at every phone. `useSyncExternalStore`
 * makes that a legitimate post-hydration update rather than a mismatch.
 */
export function useIsWideScreen(breakpoint = 1024) {
  const query = `(min-width: ${breakpoint}px)`;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () =>
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia(query).matches
        : false,
    [query],
  );

  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
