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

  const teacherName =
    invoice.booking.teacher.displayName ??
    invoice.booking.teacher.user.name ??
    invoice.booking.teacher.user.email ??
    "Teacher";

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
    teacherName,
    lessonType: `${invoice.booking.lessonProduct.nameEn} (${invoice.booking.lessonProduct.nameJa})`,
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
