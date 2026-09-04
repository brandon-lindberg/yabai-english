import { getLocale, getTranslations } from "next-intl/server";
import type { BookingStatus } from "@/generated/prisma/enums";
import { bookingStatusKey, bookingStatusTone } from "@/lib/booking-status";
import {
  CreditNoteDownloadLinks,
  InvoiceDownloadLinks,
} from "@/components/dashboard/invoice-download-links";
import { LessonListEmpty, LessonRow } from "@/components/dashboard/lesson-row";
import { formatYen } from "@/lib/format-money";

/**
 * The shape both sides of a lesson share. Written structurally rather than
 * derived from one loader, so the student's rows and the teacher's rows can use
 * the same list — they differ only in who the counterpart is.
 */
export type RefundedLessonRow = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  lessonProduct: { nameJa: string; nameEn: string };
  invoice: { id: string } | null;
  refunds: { id: string; creditNoteNo: string | null; amountYen: number }[];
};

/**
 * Lessons that were cancelled and refunded. They appear in neither the upcoming
 * nor the completed list, which left the credit note issued for them with
 * nowhere to be reached from — for either party.
 */
export async function RefundedLessons<T extends RefundedLessonRow>({
  refunded,
  counterpartLabel,
  counterpartName,
}: {
  refunded: T[];
  counterpartLabel: string;
  counterpartName: (row: T) => string;
}) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");

  if (refunded.length === 0) {
    return <LessonListEmpty>{t("noRefundedLessons")}</LessonListEmpty>;
  }

  return (
    <>
      {refunded.map((booking) => {
        const refund = booking.refunds[0];
        return (
          <LessonRow
            key={booking.id}
            bookingId={booking.id}
            locale={locale}
            lessonNameJa={booking.lessonProduct.nameJa}
            lessonNameEn={booking.lessonProduct.nameEn}
            startsAtIso={booking.startsAt.toISOString()}
            endsAtIso={booking.endsAt.toISOString()}
            counterpartLabel={counterpartLabel}
            counterpartName={counterpartName(booking)}
            /*
              The refunded amount, because it is the one fact that belongs to
              this row and nothing else. A student who cancels a lesson and then
              rebooks the same slot ends up with two bookings that are identical
              on screen — same teacher, same title, same time — one of which has
              an invoice. Saying only "Cancelled" left the invoice looking like
              it belonged to this one.
            */
            meta={
              refund
                ? t("refundedAmount", { amount: formatYen(refund.amountYen, locale) })
                : undefined
            }
            status={{
              tone: bookingStatusTone(booking.status),
              label: t(bookingStatusKey(booking.status)),
            }}
            inlineActions={
              <>
                {/*
                  The original invoice stands and the credit note reverses it;
                  Japanese consumption-tax bookkeeping wants the pair, so both
                  are always offered for a refund that succeeded.

                  Addressed by booking and by refund rather than by document id,
                  because neither document is guaranteed to have been written
                  yet — the invoice is created at one point in the booking flow
                  that not every paid booking passes through, and the credit
                  note number is assigned by the refund path. Both routes mint
                  what is owed on the way to serving it, and 404 where nothing
                  is owed.
                */}
                <InvoiceDownloadLinks
                  bookingId={booking.id}
                  englishLabel={t("downloadInvoiceEn")}
                  japaneseLabel={t("downloadInvoiceJa")}
                />
                {refund ? (
                  <CreditNoteDownloadLinks
                    refundId={refund.id}
                    englishLabel={t("downloadCreditNoteEn")}
                    japaneseLabel={t("downloadCreditNoteJa")}
                  />
                ) : null}
              </>
            }
          />
        );
      })}
    </>
  );
}
