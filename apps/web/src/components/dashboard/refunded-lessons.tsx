import { getLocale, getTranslations } from "next-intl/server";
import type { BookingStatus } from "@/generated/prisma/enums";
import { bookingStatusKey, bookingStatusTone } from "@/lib/booking-status";
import {
  CreditNoteDownloadLinks,
  InvoiceDownloadLinks,
} from "@/components/dashboard/invoice-download-links";
import { LessonListEmpty, LessonRow } from "@/components/dashboard/lesson-row";

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
  refunds: { id: string; creditNoteNo: string | null }[];
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
            status={{
              tone: bookingStatusTone(booking.status),
              label: t(bookingStatusKey(booking.status)),
            }}
            inlineActions={
              <>
                {/* The original invoice stands and the credit note reverses it.
                    Accounting needs the pair, so both are offered. */}
                {booking.invoice ? (
                  <InvoiceDownloadLinks
                    invoiceId={booking.invoice.id}
                    englishLabel={t("downloadInvoiceEn")}
                    japaneseLabel={t("downloadInvoiceJa")}
                  />
                ) : null}
                {refund?.creditNoteNo ? (
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
