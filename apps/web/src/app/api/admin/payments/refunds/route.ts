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

  const explicitStatus = REFUND_RECOVERY_STATUSES.includes(new URL(req.url).searchParams.get("status") as RefundRecoveryStatus);
  const refunds = await prisma.refund.findMany({
    where: { AND: [explicitStatus ? { status: { in: requestedStatuses(req.url) } } : { OR: [
      { status: { in: requestedStatuses(req.url) } }, { status: "SUCCEEDED", recoveryNote: { not: null } },
      { payment: { recovery: { feeRecoveryPending: true } } },
      { payment: { recovery: { state: { not: "COMPLETE" } } } },
    ] }, { OR: [{ payment: { recovery: null } }, { payment: { recovery: { state: { not: "COMPLETE" } } } }] }] },
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
