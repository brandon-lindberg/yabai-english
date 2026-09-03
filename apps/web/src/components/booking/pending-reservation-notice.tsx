"use client";

import { useTranslations } from "next-intl";
import { PendingReservationActions } from "@/components/booking/pending-reservation-actions";

type Props = {
  bookingId: string;
  startsAtIso: string;
  expiresAtIso: string;
  viewerTimezone: string;
};

/**
 * A student who backs out of checkout leaves a booking holding its slot with no
 * way forward from this page: the slot reads "Reserved" and the only recovery
 * lives in the schedule. This puts both exits — finish paying, or give the time
 * back — where the reservation was made.
 */
export function PendingReservationNotice({
  bookingId,
  startsAtIso,
  expiresAtIso,
  viewerTimezone,
}: Props) {
  const t = useTranslations("booking");

  const format = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: viewerTimezone,
    });

  return (
    <section className="mb-6 rounded-xl border border-[var(--app-warning-border)] bg-[var(--app-warning-bg)] p-4">
      <h2 className="text-sm font-bold tracking-[-0.01em] text-[var(--app-warning-text)]">
        {t("pendingReservationTitle")}
      </h2>
      <p className="mt-1 max-w-[60ch] text-sm text-foreground">
        {t("pendingReservationBody", {
          when: format(startsAtIso),
          expires: format(expiresAtIso),
        })}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PendingReservationActions bookingId={bookingId} />
      </div>
    </section>
  );
}
