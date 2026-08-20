"use client";

import { useSyncExternalStore } from "react";

/**
 * The viewer's IANA timezone, or `undefined` on the server where it cannot be
 * known.
 *
 * A store rather than an effect: it is readable only on the client, but it also
 * never changes during a session, so `subscribe` has nothing to listen to. The
 * server snapshot is `undefined` so the first paint matches the markup and
 * React re-renders once with the real zone.
 *
 * Callers must handle `undefined` by rendering a placeholder rather than a
 * fallback zone. A date formatted in the server's zone is not "close enough" —
 * it is a different day for anyone far enough east or west, which is exactly
 * the bug that put a lesson on the wrong date in the first place.
 *
 * Three components had written this out separately: `LocalDateTime`, the
 * onboarding wizard's timezone detection, and the admin booking list, which
 * needs the zone to decide which day a booking is grouped under.
 */
function subscribe() {
  return () => {};
}

function getSnapshot(): string | undefined {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
}

function getServerSnapshot(): string | undefined {
  return undefined;
}

export function useBrowserTimezone(): string | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
