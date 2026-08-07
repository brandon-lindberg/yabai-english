"use client";

import { useBrowserTimezone } from "@/hooks/use-browser-timezone";

/**
 * Render a single instant in the viewer's own timezone.
 *
 * The sibling of LocalBookingDateTimeRange, for the places that show one
 * timestamp rather than a lesson's start–end. Server components that called
 * `date.toLocaleString()` directly were formatting in the *server's* zone and
 * locale, which is neither the viewer's nor the app's.
 */

type Props = {
  iso: string;
  locale: string;
  className?: string;
  dateStyle?: "full" | "long" | "medium" | "short";
  /** `null` renders the date alone — for a review date, a deadline, a birthday. */
  timeStyle?: "full" | "long" | "medium" | "short" | null;
};

export function LocalDateTime({
  iso,
  locale,
  className,
  dateStyle = "medium",
  timeStyle = "short",
}: Props) {
  const browserTz = useBrowserTimezone();

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
      {new Date(iso).toLocaleString(locale, {
        dateStyle,
        ...(timeStyle ? { timeStyle } : {}),
        timeZone: browserTz,
      })}
    </span>
  );
}
