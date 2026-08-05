"use client";

import { useSyncExternalStore } from "react";

/**
 * Render a single instant in the viewer's own timezone.
 *
 * The sibling of LocalBookingDateTimeRange, for the places that show one
 * timestamp rather than a lesson's start–end. Server components that called
 * `date.toLocaleString()` directly were formatting in the *server's* zone and
 * locale, which is neither the viewer's nor the app's.
 */

function subscribeNoop(onStoreChange: () => void) {
  // Browser timezone never changes during a session — nothing to subscribe to.
  void onStoreChange;
  return () => {};
}

function getBrowserTz() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getServerTz(): string | undefined {
  return undefined;
}

type Props = {
  iso: string;
  locale: string;
  className?: string;
  dateStyle?: "full" | "long" | "medium" | "short";
  timeStyle?: "full" | "long" | "medium" | "short";
};

export function LocalDateTime({
  iso,
  locale,
  className,
  dateStyle = "medium",
  timeStyle = "short",
}: Props) {
  const browserTz = useSyncExternalStore(subscribeNoop, getBrowserTz, getServerTz);

  // Before hydration the zone is unknown; render nothing rather than a wrong time.
  if (!browserTz) {
    return (
      <span className={className} aria-busy="true">
        …
      </span>
    );
  }

  return (
    <span className={className}>
      {new Date(iso).toLocaleString(locale, { dateStyle, timeStyle, timeZone: browserTz })}
    </span>
  );
}
