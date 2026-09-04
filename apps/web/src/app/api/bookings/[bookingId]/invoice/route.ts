import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureInvoiceForPaidBooking } from "@/lib/ensure-invoice";

/**
 * The invoice for a booking, by the booking rather than by the invoice.
 *
 * The PDF route needs an invoice id, which is fine once one exists — but a
 * refunded lesson may have been paid without ever being given an invoice row,
 * and the student still needs the document. There is no id to link to, so this
 * addresses it by the thing that definitely exists, mints the invoice if it is
 * owed, and hands off to the one route that builds the PDF.
 *
 * A redirect rather than a second PDF implementation: everything about how an
 * invoice looks stays in one place.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, studentId: true, teacher: { select: { userId: true } } },
  });

  const isStudent = booking?.studentId === session.user.id;
  const isOwningTeacher = booking?.teacher?.userId === session.user.id;
  if (!booking || (!isStudent && !isOwningTeacher)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Issues nothing where no money was taken, so an unpaid booking still 404s
  // rather than producing a document asserting a payment that never happened.
  const invoice = await ensureInvoiceForPaidBooking(booking.id);
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lang = new URL(req.url).searchParams.get("lang") === "ja" ? "ja" : "en";
  return NextResponse.redirect(
    new URL(`/api/invoices/${invoice.id}/pdf?lang=${lang}`, req.url),
  );
}
