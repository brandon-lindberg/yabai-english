import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { BookingStatus } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { evaluateBookingCancellationPolicy } from "@/lib/booking-policy";
import { deleteMeetLessonEvent } from "@/lib/google-calendar";
import { issueAutomaticRefundForBooking } from "@/lib/payment-refunds";
import { notifySuperAdminsOfStuckRefund } from "@/lib/refund-notifications";
import { createUserNotification } from "@/lib/notifications";
import { slotHoldingBookingWhere } from "@/lib/pending-booking-hold";

type Props = { params: Promise<{ sessionId: string }> };

/**
 * Calls off a whole group class.
 *
 * Distinct from every student happening to cancel: the class itself is off, so
 * the session is marked cancelled and stops taking bookings even if seats were
 * free. Each seat is then cancelled and refunded through the same per-booking
 * path a single cancellation uses — a teacher calling off a class always
 * refunds in full, however close to the lesson it lands, which is the policy
 * `evaluateBookingCancellationPolicy` already applies to a teacher actor.
 *
 * Refunds are issued one seat at a time and a failure on one must not strand
 * the rest, so each is caught and reported rather than aborting the loop.
 */
export async function POST(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sessionId } = await params;
  const groupSession = await prisma.groupLessonSession.findUnique({
    where: { id: sessionId },
    include: {
      teacher: {
        select: { userId: true, calendarId: true, googleCalendarRefreshToken: true },
      },
      bookings: {
        where: slotHoldingBookingWhere(),
        include: {
          student: { select: { id: true, name: true } },
          payments: {
            where: { status: "SUCCEEDED" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              provider: true,
              amountYen: true,
              status: true,
              providerPaymentId: true,
              teacherPaymentAccount: { select: { providerAccountId: true } },
            },
          },
        },
      },
    },
  });

  if (!groupSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (
    session.user.role !== "SUPER_ADMIN" &&
    groupSession.teacher.userId !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (groupSession.cancelledAt) {
    return NextResponse.json({ error: "This class is already cancelled." }, { status: 409 });
  }

  // Closed first, so a student cannot take one of the seats being emptied.
  await prisma.groupLessonSession.update({
    where: { id: groupSession.id },
    data: { cancelledAt: new Date() },
  });

  const refunds = [];
  for (const booking of groupSession.bookings) {
    const policy = evaluateBookingCancellationPolicy({
      actor: "TEACHER",
      bookingStatus: booking.status,
      lessonStartsAt: booking.startsAt,
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELLED },
    });

    let refund = null;
    if (policy.refundEligible) {
      try {
        refund = await issueAutomaticRefundForBooking(prisma, {
          booking,
          policy,
          actor: "TEACHER",
        });
      } catch (error) {
        // One seat's refund failing must not leave the other students both
        // uncancelled and unrefunded.
        await notifySuperAdminsOfStuckRefund({
          amountYen: booking.quotedPriceYen,
          studentName: booking.student?.name ?? null,
          note: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (refund && refund.status !== "SUCCEEDED" && refund.status !== "PENDING") {
      await notifySuperAdminsOfStuckRefund({
        amountYen: refund.amountYen,
        studentName: booking.student?.name ?? null,
        note: refund.recoveryNote ?? null,
      });
    }
    if (refund) refunds.push(refund);

    await createUserNotification({
      userId: booking.studentId,
      titleJa: "クラスが中止されました",
      titleEn: "Class cancelled",
      bodyJa: "講師の都合によりクラスが中止されました。返金手続きを行っています。",
      bodyEn: "Your teacher cancelled this class. A refund is on its way.",
    });
  }

  // One event for the whole class, so this is the one place deleting it is
  // right — the class really is off for everybody.
  if (groupSession.googleEventId) {
    await deleteMeetLessonEvent({
      organizerUserId: groupSession.teacher.userId,
      refreshTokenEncrypted: groupSession.teacher.googleCalendarRefreshToken,
      calendarId: groupSession.googleCalendarId ?? groupSession.teacher.calendarId,
      eventId: groupSession.googleEventId,
    });
  }

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/dashboard`);
    revalidatePath(`/${locale}/dashboard/schedule`);
  }

  return NextResponse.json({
    ok: true,
    cancelledSeats: groupSession.bookings.length,
    refunds,
  });
}
