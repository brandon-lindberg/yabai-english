import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadBookingForCancellation } from "@/lib/booking-cancellation-data";
import { canResolvePrivateReschedule, hasPendingPrivateReschedule } from "@/lib/private-reschedule";
import { issueAutomaticRefundForBooking } from "@/lib/payment-refunds";
import { notifyPrivateBookingEvent } from "@/lib/private-booking-notifications";
import { notifySuperAdminsOfStuckRefund } from "@/lib/refund-notifications";
import { revalidateBookingPaths } from "@/lib/revalidate-booking-paths";
import { prepareBookingRefund } from "@/lib/payment-recovery";

const bodySchema = z.object({ action: z.enum(["close", "refund"]) }).strict();
type Props = { params: Promise<{ bookingId: string }> };

export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["TEACHER", "SUPER_ADMIN"].includes(session.user.role)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { bookingId } = await params;
  const booking = await loadBookingForCancellation(prisma, bookingId);
  if (!booking || !canResolvePrivateReschedule({ role: session.user.role, userId: session.user.id, teacherUserId: booking.teacher.userId })) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const pending = hasPendingPrivateReschedule(booking);
  const refundRetry = booking.status === "CANCELLED" && !booking.groupLessonSessionId && booking.privateRescheduleStatus === "REFUND_REQUESTED";
  if (!pending && !(parsed.data.action === "refund" && refundRetry)) return NextResponse.json({ error: "This request is already resolved." }, { status: 409 });

  if (parsed.data.action === "close") {
    const changed = await prisma.booking.updateMany({ where: { id: booking.id, status: "CANCELLED", privateRescheduleStatus: "PENDING" },
      data: { privateRescheduleStatus: "CLOSED", rescheduleResolvedAt: new Date() } });
    if (!changed.count) return NextResponse.json({ error: "The request changed. Reload before trying again." }, { status: 409 });
    await notifyPrivateBookingEvent({ bookingId, event: "reschedule_closed", transitionId: booking.rescheduleRequestedAt?.toISOString() });
    revalidateBookingPaths();
    return NextResponse.json({ ok: true, status: "CLOSED" });
  }

  if (!booking.payments?.some(payment => payment.status === "SUCCEEDED" && payment.amountYen > 0)) {
    return NextResponse.json({ error: "There is no paid amount to refund." }, { status: 409 });
  }
  const claimedAt = new Date();
  const changed = await prisma.$transaction(async tx => {
    const claimed = await tx.booking.updateMany({ where: { id: booking.id, status: "CANCELLED",
    privateRescheduleStatus: booking.privateRescheduleStatus, rescheduleResolvedAt: booking.rescheduleResolvedAt ?? null },
      data: { privateRescheduleStatus: "REFUND_REQUESTED", rescheduleResolvedAt: claimedAt } });
    if (claimed.count) await prepareBookingRefund(tx, { booking, actor: session.user.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "TEACHER",
      policy: { allowed: true, refundEligible: true, rescheduleOffered: false } });
    return claimed;
  });
  if (!changed.count) return NextResponse.json({ error: "The request changed. Reload before trying again." }, { status: 409 });
  try {
    const refund = await issueAutomaticRefundForBooking(prisma, { booking, actor: session.user.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "TEACHER",
      policy: { allowed: true, refundEligible: true, rescheduleOffered: false } });
    if (refund && !["SUCCEEDED", "PENDING"].includes(refund.status)) await notifySuperAdminsOfStuckRefund({ amountYen: refund.amountYen,
      studentName: booking.student?.name ?? null, note: refund.recoveryNote ?? null });
    revalidateBookingPaths();
    return NextResponse.json({ ok: true, status: "REFUND_REQUESTED", refund });
  } catch {
    // Retain the refund decision so a replacement cannot race an uncertain provider result.
    await prisma.booking.updateMany({ where: { id: booking.id, privateRescheduleStatus: "REFUND_REQUESTED", rescheduleResolvedAt: claimedAt },
      data: { rescheduleResolvedAt: null } });
    revalidateBookingPaths();
    return NextResponse.json({ error: "The refund could not complete. Retry the refund." }, { status: 502 });
  }
}
