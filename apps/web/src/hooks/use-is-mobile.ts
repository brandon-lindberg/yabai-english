"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the viewport is narrower than the given breakpoint (default 640px = Tailwind `sm`).
 * During SSR / first paint it returns `false` to avoid hydration mismatches; the real
 * value kicks in after the first client-side effect.
 */
export function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}
