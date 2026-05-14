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

  const rows: TeacherInvoiceCsvRowInput[] = invoices.map((inv) => ({
    invoiceNo: inv.invoiceNo,
    teacherDisplay: inv.booking.teacher.user.name ?? inv.booking.teacher.user.email ?? "—",
    studentDisplay: inv.student.name ?? inv.student.email ?? "—",
    lessonTypeJaEn: `${inv.booking.lessonProduct.nameJa} / ${inv.booking.lessonProduct.nameEn}`,
    lessonLengthMinutes: inv.booking.lessonProduct.durationMin,
    lessonStartsAt: inv.booking.startsAt,
    amountYenTaxIncluded: inv.amountYen,
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
