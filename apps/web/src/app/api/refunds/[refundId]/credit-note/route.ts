import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildInvoicePdf, type InvoicePdfLanguage } from "@/lib/invoice-pdf";

type Props = {
  params: Promise<{ refundId: string }>;
};

/**
 * The 適格返還請求書 for a refund: the same lesson as the original invoice, with
 * the amounts returned. Served rather than stored — every field is already on
 * the refund and the invoice it reverses, so there is nothing to keep in sync.
 */
export async function GET(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { refundId } = await params;
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: {
      booking: {
        include: {
          student: true,
          teacher: { include: { user: true } },
          lessonProduct: true,
          invoice: true,
        },
      },
    },
  });

  const booking = refund?.booking;
  const isStudent = booking?.studentId === session.user.id;
  const isOwningTeacher = booking?.teacher?.userId === session.user.id;
  if (!refund || !booking || (!isStudent && !isOwningTeacher)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // No number means the money has not gone back, so there is no document to
  // issue yet. The original invoice still stands on its own until then.
  if (!refund.creditNoteNo || !booking.invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const language = resolveInvoiceLanguage(req.url);
  const dateLocale = language === "ja" ? "ja-JP" : "en-US";
  const payment = await prisma.payment.findUnique({
    where: { bookingId: booking.id },
    select: { method: true },
  });

  const pdfBytes = await buildInvoicePdf({
    // The invoice this return reverses; the credit note carries its own number
    // separately.
    invoiceNo: booking.invoice.invoiceNo,
    amountYen: refund.amountYen,
    paidAt: formatInvoiceDisplayDate(booking.invoice.paidAt, dateLocale),
    studentName: booking.student.name ?? booking.student.email ?? "Student",
    className:
      language === "ja" ? booking.lessonProduct.nameJa : booking.lessonProduct.nameEn,
    durationMin: booking.lessonProduct.durationMin,
    lessonDate: formatInvoiceDisplayDate(booking.startsAt, dateLocale),
    language,
    teacherName:
      booking.teacher.displayName ??
      booking.teacher.user.name ??
      booking.teacher.user.email ??
      "Teacher",
    paymentMethod: payment?.method ?? null,
    creditNote: {
      creditNoteNo: refund.creditNoteNo,
      refundedAt: formatInvoiceDisplayDate(refund.createdAt, dateLocale),
    },
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${refund.creditNoteNo}-${language}.pdf"`,
    },
  });
}

function resolveInvoiceLanguage(url: string): InvoicePdfLanguage {
  const lang = new URL(url).searchParams.get("lang");
  return lang === "ja" ? "ja" : "en";
}

function formatInvoiceDisplayDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  });
}
