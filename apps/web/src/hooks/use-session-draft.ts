"use client";

import { useCallback, useState } from "react";

export function clearSessionDraft(key: string, legacyKey?: string) {
  try {
    window.sessionStorage.removeItem(key);
    if (legacyKey) window.sessionStorage.removeItem(legacyKey);
  } catch {
    // Storage may be blocked; the form must still work.
  }
}

/**
 * Form state that survives the component being torn down and rebuilt.
 *
 * A multi-step form holds its answers in component state, which lasts exactly
 * as long as the mount. Switching language navigates to the other locale's URL
 * — a different route, so a full remount — and the wizard came back at step one
 * with every answer reset.
 *
 * `sessionStorage` rather than the URL: the step alone could live in a query
 * param, but restoring the step without the answers is worse than the bug, and
 * a wizard's whole draft does not belong in a shareable link. Per-tab and
 * cleared when the tab closes is the right lifetime for something half-filled.
 *
 * Every access is wrapped: a private window, or a browser set to block site
 * data, throws on the accessor itself rather than returning null. A form that
 * cannot remember must still open.
 */
export function useSessionDraft<T>(
  key: string,
  initial: T,
  legacyKey?: string,
): [T, (next: T) => void, () => void] {
  const [draft, setDraftState] = useState<T>(() => {
    try {
      const stored = window.sessionStorage.getItem(key) ?? (legacyKey ? window.sessionStorage.getItem(legacyKey) : null);
      if (!stored) return initial;
      // A shape written by an older version of the form parses fine and then
      // reads as nonsense, so callers get the defaults merged underneath.
      return { ...initial, ...(JSON.parse(stored) as T) };
    } catch {
      return initial;
    }
  });

  const setDraft = useCallback(
    (next: T) => {
      setDraftState(next);
      try {
        window.sessionStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Not remembering is a degraded experience, not a failure.
      }
    },
    [key],
  );

  const clear = useCallback(() => {
    clearSessionDraft(key, legacyKey);
  }, [key, legacyKey]);

  return [draft, setDraft, clear];
}
