import { prisma } from "@/lib/prisma";
import { buildInvoiceNumber } from "@/lib/invoices";

/**
 * Gives a paid booking the invoice it is owed, once.
 *
 * A lesson that was paid for is owed an invoice, and a lesson that was then
 * refunded is owed a credit note reversing it. Both were missing for a real
 * booking — ¥3,500 collected, ¥3,500 returned, and nothing the student could
 * download — because the invoice is written at one point in the booking flow
 * and a booking that reached "paid" by another route never passed through it.
 *
 * Issued on demand rather than backfilled by a migration, in the same shape as
 * `ensureCreditNoteNumber`: the document is minted the first time somebody
 * actually needs it, and an existing one is never replaced, because the number
 * is the document's identity and a second would leave two documents for one
 * payment.
 *
 * Nothing is issued where no money was taken. A free trial, or a booking
 * abandoned before checkout, has no invoice to give — and one for a payment
 * that never succeeded would be a document asserting a fact that is not true.
 */
export async function ensureInvoiceForPaidBooking(
  bookingId: string,
): Promise<{ id: string; invoiceNo: string; paidAt: Date | null } | null> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      studentId: true,
      quotedPriceYen: true,
      invoice: { select: { id: true, invoiceNo: true, paidAt: true } },
    },
  });
  if (!booking) return null;
  if (booking.invoice) return booking.invoice;

  const payment = await prisma.payment.findUnique({
    where: { bookingId },
    select: { status: true },
  });
  if (payment?.status !== "SUCCEEDED") return null;

  const now = new Date();
  return prisma.invoice.create({
    data: {
      bookingId: booking.id,
      studentId: booking.studentId,
      amountYen: booking.quotedPriceYen,
      invoiceNo: buildInvoiceNumber(now),
      paidAt: now,
    },
    select: { id: true, invoiceNo: true, paidAt: true },
  });
}
