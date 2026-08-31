import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";
import { buildTeacherInvoicesCsv, type TeacherInvoiceCsvRowInput } from "@/lib/teacher-invoice-csv";

const querySchema = z.object({
  studentId: z.string().min(1).optional().default("all"),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !isTeacherCabinetRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "No teacher profile" }, { status: 404 });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    studentId: url.searchParams.get("studentId") ?? "all",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { studentId } = parsed.data;
  const studentFilter =
    studentId === "all"
      ? {}
      : {
          studentId,
        };

  const invoices = await prisma.invoice.findMany({
    where: {
      booking: { teacherId: profile.id },
      ...studentFilter,
    },
    include: {
      student: { select: { name: true, email: true } },
      booking: {
        include: {
          lessonProduct: { select: { nameJa: true, nameEn: true, durationMin: true } },
          teacher: { include: { user: { select: { name: true, email: true } } } },
        },
      },
    },
    orderBy: [{ paidAt: "desc" }, { id: "desc" }],
  });

  // One query for the whole export rather than one per invoice.
  const payments = await prisma.payment.findMany({
    where: { bookingId: { in: invoices.map((inv) => inv.bookingId) } },
    select: { bookingId: true, method: true },
  });
  const methodByBookingId = new Map(
    payments.map((payment) => [payment.bookingId, payment.method]),
  );

  // One query for the refunds too. Newest first so a booking refunded more than
  // once (a retry after a failure) reports the attempt that stands.
  const refunds = await prisma.refund.findMany({
    where: { bookingId: { in: invoices.map((inv) => inv.bookingId) } },
    orderBy: { createdAt: "desc" },
    select: {
      bookingId: true,
      creditNoteNo: true,
      amountYen: true,
      status: true,
      createdAt: true,
    },
  });
  const refundByBookingId = new Map<string, (typeof refunds)[number]>();
  for (const refund of refunds) {
    if (!refundByBookingId.has(refund.bookingId)) {
      refundByBookingId.set(refund.bookingId, refund);
    }
  }

  const rows: TeacherInvoiceCsvRowInput[] = invoices.map((inv) => ({
    invoiceNo: inv.invoiceNo,
    teacherDisplay: inv.booking.teacher.user.name ?? inv.booking.teacher.user.email ?? "—",
    studentDisplay: inv.student.name ?? inv.student.email ?? "—",
    lessonTypeJaEn: `${inv.booking.lessonProduct.nameJa} / ${inv.booking.lessonProduct.nameEn}`,
    lessonLengthMinutes: inv.booking.lessonProduct.durationMin,
    lessonStartsAt: inv.booking.startsAt,
    paidAt: inv.paidAt,
    amountYenTaxIncluded: inv.amountYen,
    paymentMethod: methodByBookingId.get(inv.bookingId) ?? null,
    refund: (() => {
      const refund = refundByBookingId.get(inv.bookingId);
      return refund
        ? {
            creditNoteNo: refund.creditNoteNo,
            amountYen: refund.amountYen,
            refundedAt: refund.createdAt,
            status: refund.status,
          }
        : null;
    })(),
  }));

  const csv = buildTeacherInvoicesCsv(rows);
  const filenameSuffix = studentId === "all" ? "all-students" : "one-student";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lesson-invoices-${filenameSuffix}.csv"`,
    },
  });
}
