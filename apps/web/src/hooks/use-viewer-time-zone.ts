"use client";

import { useSyncExternalStore } from "react";

function subscribeNoop(onStoreChange: () => void) {
  // A browser's timezone never changes during a session — nothing to subscribe to.
  void onStoreChange;
  return () => {};
}

function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getServerTimeZone(): string | undefined {
  return undefined;
}

/**
 * The viewer's IANA timezone, or `undefined` until the client has mounted.
 *
 * Server-rendering a local time would use the *server's* zone — the bug that
 * once showed Japanese students UTC wall time for the lesson they were paying
 * for. Deferring to the client is the fix, and it belongs in one place now that
 * more than one surface formats a lesson time.
 */
export function useViewerTimeZone(preferred?: string): string | undefined {
  const browserTimeZone = useSyncExternalStore(
    subscribeNoop,
    getBrowserTimeZone,
    getServerTimeZone,
  );
  return preferred ?? browserTimeZone;
}
