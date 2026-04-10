import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildInvoiceCsv } from "@/lib/invoice-csv";

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
        },
      },
    },
  });

  if (!invoice || invoice.studentId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const csv = buildInvoiceCsv({
    invoiceNo: invoice.invoiceNo,
    amountYen: invoice.amountYen,
    paidAtIso: invoice.paidAt.toISOString(),
    bookingId: invoice.bookingId,
    studentEmail: invoice.student.email ?? "",
    teacherName:
      invoice.booking.teacher.displayName ??
      invoice.booking.teacher.user.name ??
      invoice.booking.teacher.user.email ??
      "Teacher",
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${invoice.invoiceNo}.csv\"`,
    },
  });
}
