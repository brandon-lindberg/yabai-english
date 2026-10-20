"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { Button, buttonClasses } from "@/components/ui/button";
import { Status } from "@/components/ui/status";
import { bookingStatusKey, bookingStatusTone } from "@/lib/booking-status";
import type { BookingDisplayStatus } from "@/lib/booking-status";
import { formatYen } from "@/lib/format-money";
import { PendingReservationActions } from "@/components/booking/pending-reservation-actions";
import { BookingCancelButton } from "@/components/dashboard/booking-cancel-button";
import { InvoiceDownloadLinks } from "@/components/dashboard/invoice-download-links";
import { TeacherLessonCompletionNotesForm } from "@/components/dashboard/teacher-lesson-completion-notes-form";
import { MarkdownClamp } from "@/components/ui/markdown-clamp";
import { actionLinkClass } from "@/components/ui/inline-link";
import { useRouter } from "@/i18n/navigation";

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
  /** Present only for a lesson already taught — see `LessonRecord`. */
  record?: LessonRecord | null;
};

/**
 * What the completed history shows for a lesson once it has been taught.
 *
 * Carried on the calendar so a past lesson opens in place, like any other,
 * rather than sending someone to another tab to glance at what was covered.
 */
export type LessonRecord = {
  notesMd: string | null;
  transcriptUrl: string | null;
  invoiceId: string | null;
  /** Has a Calendar event, so its Gemini notes document can be looked up. */
  canFetchNotesLink: boolean;
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
  if (!booking) return null;

  // Keyed so each opening reads the clock afresh, rather than once when the
  // calendar first mounted.
  return (
    <BookingDetailDialog
      key={booking.id}
      booking={booking}
      viewer={viewer}
      timeZone={timeZone}
      onClose={onClose}
    />
  );
}

function BookingDetailDialog({
  booking,
  viewer,
  timeZone,
  onClose,
}: {
  booking: CalendarBookingDetail;
  viewer: "teacher" | "student";
  timeZone: string;
  onClose: () => void;
}) {
  const t = useTranslations("booking");
  const td = useTranslations("dashboard");
  const locale = useLocale();
  const tsp = useTranslations("dashboard.schedulePage");
  const router = useRouter();
  const [now] = useState(() => Date.now());

  const when = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(booking.startsAtIso));

  /*
    A past lesson keeps its status — nothing flips CONFIRMED to COMPLETED when
    the clock runs out — so the time itself decides what is still actionable.
    The call stays joinable until it ends, for whoever is running late; paying
    for or cancelling a lesson stops making sense the moment it begins.
  */
  const started = new Date(booking.startsAtIso).getTime() <= now;
  const ended = new Date(booking.endsAtIso).getTime() <= now;

  const awaitingPayment = booking.status === "PENDING_PAYMENT" && !started;
  /*
    Cancelling is about giving a time back, so it is offered only while there
    is a time to give back. A lesson already taught, one already cancelled, and
    a reservation whose hold has lapsed all have nothing left to release — the
    button would only fail at the API and read as a broken control.
  */
  const canCancel = !started && (booking.status === "CONFIRMED" || awaitingPayment);
  const canJoin = !ended && booking.status === "CONFIRMED" && Boolean(booking.meetUrl);
  // Taught, as far as anyone looking at it is concerned: the history page calls
  // these completed, and the dialog should not disagree with it.
  const displayStatus: BookingDisplayStatus =
    ended && booking.status === "CONFIRMED" ? "COMPLETED" : booking.status;
  const record = booking.record ?? null;
  const notesMd = record?.notesMd?.trim() ?? "";
  const transcriptUrl = record?.transcriptUrl?.trim() ?? "";

  return (
    <Modal
      open
      onClose={onClose}
      title={displayStatus === "COMPLETED" ? t("bookingDetailTitleCompleted") : t("bookingDetailTitle")}
      description={when}
      // The teacher's notes form needs the room; a read-only record does not.
      size={record && viewer === "teacher" ? "lg" : "md"}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("bookingDetailClose")}
          </Button>
          {canJoin && booking.meetUrl ? (
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
          <Status tone={bookingStatusTone(displayStatus)}>
            {td(bookingStatusKey(displayStatus))}
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
        {record?.invoiceId ? (
          <DetailRow label={t("bookingDetailInvoice")}>
            <span className="inline-flex flex-wrap justify-end gap-2">
              <InvoiceDownloadLinks
                invoiceId={record.invoiceId}
                englishLabel={td("downloadInvoiceEn")}
                japaneseLabel={td("downloadInvoiceJa")}
              />
            </span>
          </DetailRow>
        ) : null}
      </dl>

      {/*
        The same record the completed history keeps: the teacher writes it, the
        student reads it. Refreshed on save so reopening the lesson shows what
        was just written rather than what the page loaded with.
      */}
      {record && viewer === "teacher" ? (
        <TeacherLessonCompletionNotesForm
          variant="embedded"
          bookingId={booking.id}
          initialCompletionNotesMd={record.notesMd}
          initialExternalTranscriptUrl={record.transcriptUrl}
          canFetchNotesLink={record.canFetchNotesLink}
          onSaved={() => router.refresh()}
        />
      ) : null}
      {record && viewer === "student" && (transcriptUrl || notesMd) ? (
        <div className="space-y-2 text-sm">
          {transcriptUrl ? (
            <p>
              <a
                href={transcriptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={actionLinkClass}
              >
                {tsp("transcriptLinkStudentCta")}
              </a>
            </p>
          ) : null}
          {notesMd ? (
            <div>
              <p className="text-xs font-semibold text-foreground">{tsp("lessonNotesReadLabel")}</p>
              <MarkdownClamp markdown={notesMd} emptyLabel="" />
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
