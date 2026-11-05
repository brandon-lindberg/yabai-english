import { isStaleBookingMutation, STALE_BOOKING_MESSAGE } from "@/lib/booking-conflict";
import { NextResponse } from "next/server";
import { BookingStatus } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBookingPaths } from "@/lib/revalidate-booking-paths";
import { loadBookingForCancellation } from "@/lib/booking-cancellation-data";
import { evaluateBookingCancellationPolicy } from "@/lib/booking-policy";
import { cleanCancelledBookingCalendar } from "@/lib/cancelled-booking-calendar";
import { issueAutomaticRefundForBooking } from "@/lib/payment-refunds";
import { notifySuperAdminsOfStuckRefund } from "@/lib/refund-notifications";
import { notifyPrivateBookingEvent } from "@/lib/private-booking-notifications";
import { evaluateBookingReschedulePolicy } from "@/lib/booking-reschedule";
import type { BookingCancellationPreview } from "@/lib/booking-cancellation-preview";
import { prepareBookingRefund } from "@/lib/payment-recovery";

type Props = {
  params: Promise<{ bookingId: string }>;
};

function resolveCancellationActor(
  role: string,
  userId: string,
  booking: { studentId: string; teacherUserId: string },
): "STUDENT" | "TEACHER" | "SUPER_ADMIN" | null {
  if (role === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (role === "STUDENT" && booking.studentId === userId) return "STUDENT";
  if (role === "TEACHER" && booking.teacherUserId === userId) return "TEACHER";
  return null;
}

async function readCancellationContext(params: Props["params"]) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await params;

  const booking = await loadBookingForCancellation(prisma, bookingId);

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const actor = resolveCancellationActor(session.user.role, session.user.id, {
    studentId: booking.studentId,
    teacherUserId: booking.teacher.userId,
  });

  if (!actor) {
    if (session.user.role === "STUDENT") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const policy = evaluateBookingCancellationPolicy({
    actor,
    bookingStatus: booking.status,
    lessonStartsAt: booking.startsAt,
  });

  return { booking, actor, policy };
}

export async function GET(_req: Request, { params }: Props) {
  const context = await readCancellationContext(params);
  if (context instanceof Response) return context;
  const { booking, actor, policy } = context;
  const studentPrivate = actor === "STUDENT" && !booking.groupLessonSessionId && booking.status === "CONFIRMED";
  const preview: BookingCancellationPreview = {
    policy,
    studentPrivate,
    reschedule: studentPrivate ? evaluateBookingReschedulePolicy({ actor, bookingStatus: booking.status,
      lessonStartsAt: booking.startsAt, rescheduleCount: booking.rescheduleCount }) : null,
    timeZone: booking.student?.studentProfile?.timezone ?? "Asia/Tokyo",
    refundAmountYen: policy.refundEligible ? booking.payments?.[0]?.amountYen ?? 0 : 0,
  };
  return NextResponse.json(preview, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request, { params }: Props) {
  const context = await readCancellationContext(params);
  if (context instanceof Response) return context;
  const { booking, actor, policy } = context;

  const intent = (await req.json().catch(() => null))?.intent;
  if (intent === "refund" && !policy.refundEligible) {
    return NextResponse.json({ code: "REFUND_WINDOW_CHANGED", error: "Refund eligibility changed. Review the options before confirming.", policy }, { status: 409 });
  }
  if (intent === "request_reschedule" && !(actor === "STUDENT" && !booking.groupLessonSessionId && policy.rescheduleOffered)) {
    return NextResponse.json({ code: "POLICY_CHANGED", error: "The lesson changed. Review its options again.", policy }, { status: 409 });
  }

  if (!policy.allowed) {
    return NextResponse.json(
      { error: "This booking cannot be cancelled.", policy },
      { status: 409 },
    );
  }

  let updated;
  const replacementRequested = actor === "STUDENT" && !booking.groupLessonSessionId && policy.rescheduleOffered;
  try {
    updated = await prisma.$transaction(async tx => {
    const cancelled = await tx.booking.update({
    where: { id: booking.id, status: booking.status, startsAt: booking.startsAt },
    data: { status: BookingStatus.CANCELLED, cancelledFromStatus: booking.status, ...(replacementRequested ? {
      privateRescheduleStatus: "PENDING", rescheduleRequestedAt: new Date(), rescheduleResolvedAt: null,
      googleEventId: null, studentGoogleEventId: null, meetUrl: null, meetCode: null, meetConferenceId: null,
    } : {}) },
    select: {
      id: true,
      status: true,
      startsAt: true,
      endsAt: true,
      privateRescheduleStatus: true,
    },
    });
    await prepareBookingRefund(tx, { booking, policy, actor });
    return cancelled;
    });
  } catch (error) {
    if (isStaleBookingMutation(error)) return NextResponse.json({ error: STALE_BOOKING_MESSAGE }, { status: 409 });
    throw error;
  }
  // The obligation already committed with cancellation. Secondary delivery cannot lose it.
  await notifyPrivateBookingEvent({ bookingId: booking.id, event: "cancelled" }).catch(() => undefined);
  if (replacementRequested) await notifyPrivateBookingEvent({ bookingId: booking.id, event: "reschedule_requested",
    transitionId: booking.updatedAt?.toISOString() });
  const refund = policy.refundEligible
    ? await issueAutomaticRefundForBooking(prisma, { booking, policy, actor }) : null;

  await cleanCancelledBookingCalendar(booking);

  // A refund that did not reach the student is owed money nobody else is
  // watching, so tell the people who can fix it rather than waiting for a
  // complaint.
  if (refund && refund.status !== "SUCCEEDED" && refund.status !== "PENDING") {
    await notifySuperAdminsOfStuckRefund({
      amountYen: refund.amountYen,
      studentName: booking.student?.name ?? null,
      note: refund.recoveryNote ?? null,
    });
  }

  revalidateBookingPaths();

  return NextResponse.json({
    ok: true,
    booking: updated,
    policy,
    refund,
  });
}
