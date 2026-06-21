import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildInvoicePdf, type InvoicePdfLanguage } from "@/lib/invoice-pdf";

type Props = {
  params: Promise<{ invoiceId: string }>;
};

export async function GET(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { invoiceId } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      student: true,
      booking: {
        include: {
          teacher: { include: { user: true } },
          lessonProduct: true,
        },
      },
    },
  });

  const isStudent = invoice?.studentId === session.user.id;
  const isOwningTeacher = invoice?.booking?.teacher?.userId === session.user.id;
  if (!invoice || (!isStudent && !isOwningTeacher)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const studentName =
    invoice.student.name ?? invoice.student.email ?? "Student";
  const language = resolveInvoiceLanguage(req.url);
  const dateLocale = language === "ja" ? "ja-JP" : "en-US";
  const lessonDate = formatInvoiceDisplayDate(invoice.booking.startsAt, dateLocale);

  const pdfBytes = await buildInvoicePdf({
    invoiceNo: invoice.invoiceNo,
    amountYen: invoice.amountYen,
    paidAt: lessonDate,
    studentName,
    className:
      language === "ja"
        ? invoice.booking.lessonProduct.nameJa
        : invoice.booking.lessonProduct.nameEn,
    durationMin: invoice.booking.lessonProduct.durationMin,
    lessonDate,
    language,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNo}-${language}.pdf"`,
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
