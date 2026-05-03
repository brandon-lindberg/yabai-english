import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildInvoicePdf } from "@/lib/invoice-pdf";

type Props = {
  params: Promise<{ invoiceId: string }>;
};

export async function GET(_req: Request, { params }: Props) {
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

  if (!invoice || invoice.studentId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const studentName =
    invoice.student.name ?? invoice.student.email ?? "Student";

  const pdfBytes = await buildInvoicePdf({
    invoiceNo: invoice.invoiceNo,
    amountYen: invoice.amountYen,
    paidAt: invoice.paidAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    studentName,
    className: invoice.booking.lessonProduct.nameEn,
    durationMin: invoice.booking.lessonProduct.durationMin,
    lessonDate: invoice.booking.startsAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNo}.pdf"`,
    },
  });
}
