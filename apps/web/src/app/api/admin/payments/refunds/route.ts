import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { adminRefundRecoveryWhere, REFUND_RECOVERY_STATUSES } from "@/lib/refund-recovery";
import { adminLessonsForPerson } from "@/lib/admin/lesson-filters";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const query = new URL(req.url).searchParams;
  const requested = query.get("status");
  const person = query.get("person");
  if (person && person.length > 200) return NextResponse.json({ error: "Invalid account filter" }, { status: 400 });
  const refunds = await prisma.refund.findMany({
    where: {
      ...adminRefundRecoveryWhere(REFUND_RECOVERY_STATUSES.find((status) => status === requested)),
      ...(person ? { booking: adminLessonsForPerson(person) } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      status: true,
      amountYen: true,
      actor: true,
      reason: true,
      recoveryNote: true,
      providerRefundId: true,
      paymentId: true,
      payment: { select: { recovery: { select: { feeRecoveryPending: true, lastError: true, state: true } } } },
      createdAt: true,
      booking: {
        select: {
          id: true,
          startsAt: true,
          student: { select: { id: true, name: true, email: true } },
          teacher: { select: { user: { select: { id: true, name: true, email: true } } } },
        },
      },
    },
  });

  return NextResponse.json({
    items: refunds.map((refund) => ({
      id: refund.id,
      status: refund.status,
      paymentId: refund.paymentId,
      feeRecoveryPending: refund.payment?.recovery?.feeRecoveryPending ?? (refund.status === "SUCCEEDED" && Boolean(refund.recoveryNote)),
      amountYen: refund.amountYen,
      actor: refund.actor,
      reason: refund.reason,
      recoveryNote: refund.payment?.recovery?.lastError ?? refund.recoveryNote,
      providerRefundId: refund.providerRefundId,
      createdAt: refund.createdAt,
      bookingId: refund.booking.id,
      lessonStartsAt: refund.booking.startsAt,
      student: refund.booking.student,
      teacher: refund.booking.teacher.user,
    })),
  });
}
