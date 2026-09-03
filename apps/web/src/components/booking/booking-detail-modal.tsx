"use client";

import { useLocale, useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { Button, buttonClasses } from "@/components/ui/button";
import { Status } from "@/components/ui/status";
import { bookingStatusKey, bookingStatusTone } from "@/lib/booking-status";
import type { BookingDisplayStatus } from "@/lib/booking-status";
import { formatYen } from "@/lib/format-money";
import { PendingReservationActions } from "@/components/booking/pending-reservation-actions";
import { BookingCancelButton } from "@/components/dashboard/booking-cancel-button";

/**
 * What one reservation on a calendar actually is.
 *
 * A chip has room for a time and one line about it. Everything else — who,
 * which lesson, how long, what it cost, who else is in the class — has to live
 * somewhere, and the calendar is where people look at their day. So the chip
 * carries the minimum and this carries the rest.
 */
export type CalendarBookingDetail = {
  id: string;
  startsAtIso: string;
  endsAtIso: string;
  status: BookingDisplayStatus;
  /** The other person: the student for a teacher, the teacher for a student. */
  counterpartLabel: string;
  lessonLabel: string;
  durationMin: number;
  priceYen: number | null;
  meetUrl: string | null;
  /** Present only for a seat in a group class. */
  groupSeats: { capacity: number; taken: number } | null;
  /** Who else is in the class. Teacher-side only — see the note below. */
  classmates?: string[];
  holdExpiresAtIso?: string | null;
};

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-6 border-b border-border py-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-foreground">{children}</dd>
    </div>
  );
}

export function BookingDetailModal({
  booking,
  viewer,
  timeZone,
  onClose,
}: {
  booking: CalendarBookingDetail | null;
  /**
   * Decides who the counterpart is, and who may act. A student may finish
   * paying for their own reservation; a teacher never can, and never sees a
   * button offering to charge somebody else's card.
   */
  viewer: "teacher" | "student";
  /**
   * The calendar's own zone — the student's dashboard timezone, or the
   * teacher's availability zone. Required rather than defaulted: the chips
   * behind this dialog are drawn in that zone, and a header falling back to the
   * browser's would put one lesson at two times on the same screen.
   */
  timeZone: string;
  onClose: () => void;
}) {
  const t = useTranslations("booking");
  const td = useTranslations("dashboard");
  const locale = useLocale();

  if (!booking) return null;

  const when = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(booking.startsAtIso));

  const awaitingPayment = booking.status === "PENDING_PAYMENT";
  /*
    Cancelling is about giving a time back, so it is offered only while there
    is a time to give back. A lesson already taught, one already cancelled, and
    a reservation whose hold has lapsed all have nothing left to release — the
    button would only fail at the API and read as a broken control.
  */
  const canCancel = booking.status === "CONFIRMED" || awaitingPayment;

  return (
    <Modal
      open
      onClose={onClose}
      title={t("bookingDetailTitle")}
      description={when}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("bookingDetailClose")}
          </Button>
          {booking.meetUrl && booking.status === "CONFIRMED" ? (
            <a
              href={booking.meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses()}
            >
              {td("meetLink")}
            </a>
          ) : null}
          {viewer === "student" && awaitingPayment ? (
            <PendingReservationActions bookingId={booking.id} />
          ) : canCancel ? (
            <BookingCancelButton bookingId={booking.id} />
          ) : null}
        </>
      }
    >
      <dl className="border-t border-border text-sm">
        <DetailRow
          label={viewer === "teacher" ? t("bookingDetailWho") : t("bookingDetailWithTeacher")}
        >
          {booking.groupSeats
            ? t("slotGroupSeats", {
                taken: booking.groupSeats.taken,
                capacity: booking.groupSeats.capacity,
              })
            : booking.counterpartLabel}
        </DetailRow>
        <DetailRow label={t("selectProduct")}>{booking.lessonLabel}</DetailRow>
        <DetailRow label={t("reviewDuration")}>
          <span className="tabular-nums">
            {t("reviewDurationValue", { count: booking.durationMin })}
          </span>
        </DetailRow>
        {booking.priceYen !== null ? (
          <DetailRow label={t("reviewPrice")}>
            <span className="tabular-nums">{formatYen(booking.priceYen, locale)}</span>
          </DetailRow>
        ) : null}
        <DetailRow label={t("bookingDetailStatus")}>
          <Status tone={bookingStatusTone(booking.status)}>
            {td(bookingStatusKey(booking.status))}
          </Status>
        </DetailRow>
        {/*
          Classmates are named only where the caller passed them, which is the
          teacher's calendar. A student learns that three seats are taken, never
          by whom — the same rule the booking page has always held.
        */}
        {booking.classmates && booking.classmates.length > 0 ? (
          <DetailRow label={t("bookingDetailClassmates")}>
            {booking.classmates.join(", ")}
          </DetailRow>
        ) : null}
      </dl>
    </Modal>
  );
}
