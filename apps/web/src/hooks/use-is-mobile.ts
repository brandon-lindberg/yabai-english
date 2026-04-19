"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Returns true when the viewport is narrower than the given breakpoint (default 640px = Tailwind `sm`).
 * Uses `useSyncExternalStore` so there's no synchronous setState-in-effect.
 * SSR snapshot returns `false` to avoid hydration mismatches.
 */
export function useIsMobile(breakpoint = 640) {
  const query = `(max-width: ${breakpoint - 1}px)`;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
