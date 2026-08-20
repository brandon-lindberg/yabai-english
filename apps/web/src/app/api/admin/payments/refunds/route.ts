import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { REFUND_RECOVERY_STATUSES, type RefundRecoveryStatus } from "@/lib/refund-recovery";

function requestedStatuses(url: string): RefundRecoveryStatus[] {
  const requested = new URL(url).searchParams.get("status");
  const match = REFUND_RECOVERY_STATUSES.find((status) => status === requested);
  return match ? [match] : [...REFUND_RECOVERY_STATUSES];
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const refunds = await prisma.refund.findMany({
    where: { status: { in: requestedStatuses(req.url) } },
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
      amountYen: refund.amountYen,
      actor: refund.actor,
      reason: refund.reason,
      recoveryNote: refund.recoveryNote,
      providerRefundId: refund.providerRefundId,
      createdAt: refund.createdAt,
      bookingId: refund.booking.id,
      lessonStartsAt: refund.booking.startsAt,
      student: refund.booking.student,
      teacher: refund.booking.teacher.user,
    })),
  });
}
