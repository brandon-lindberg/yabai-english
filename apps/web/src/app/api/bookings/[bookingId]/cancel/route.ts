import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { BookingStatus } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { evaluateBookingCancellationPolicy } from "@/lib/booking-policy";
import {
  deleteMeetLessonEvent,
  removeMeetLessonEventAttendee,
} from "@/lib/google-calendar";
import { bookingOwnsItsCalendarEvent } from "@/lib/booking-calendar-ownership";
import { issueAutomaticRefundForBooking } from "@/lib/payment-refunds";
import { notifySuperAdminsOfStuckRefund } from "@/lib/refund-notifications";

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

export async function POST(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      student: { select: { name: true, email: true } },
      teacher: {
        select: {
          userId: true,
          googleCalendarRefreshToken: true,
          calendarId: true,
        },
      },
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
          teacherPaymentAccount: {
            select: {
              providerAccountId: true,
            },
          },
        },
      },
    },
  });

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

  if (!policy.allowed) {
    return NextResponse.json(
      { error: "This booking cannot be cancelled.", policy },
      { status: 409 },
    );
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: BookingStatus.CANCELLED },
    select: {
      id: true,
      status: true,
      startsAt: true,
      endsAt: true,
    },
  });

  // A seat's event belongs to the class, so cancelling one seat takes that
  // student off the guest list. Deleting it — which is right for a private
  // lesson — would cancel the lesson for every classmate.
  const teacherCalendar = {
    organizerUserId: booking.teacher.userId,
    refreshTokenEncrypted: booking.teacher.googleCalendarRefreshToken,
    calendarId: booking.googleCalendarId ?? booking.teacher.calendarId,
  };
  await Promise.all([
    booking.googleEventId
      ? bookingOwnsItsCalendarEvent(booking)
        ? deleteMeetLessonEvent({ ...teacherCalendar, eventId: booking.googleEventId })
        : booking.student?.email
          ? removeMeetLessonEventAttendee({
              ...teacherCalendar,
              eventId: booking.googleEventId,
              attendeeEmail: booking.student.email,
            })
          : Promise.resolve(false)
      : Promise.resolve(false),
    booking.studentGoogleEventId
      ? deleteMeetLessonEvent({
          organizerUserId: booking.studentId,
          refreshTokenEncrypted: null,
          eventId: booking.studentGoogleEventId,
        })
      : Promise.resolve(false),
  ]);

  const refund = policy.refundEligible
    ? await issueAutomaticRefundForBooking(prisma, {
        booking,
        policy,
        actor,
      })
    : null;

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

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/dashboard`);
    revalidatePath(`/${locale}/dashboard/schedule`);
  }

  return NextResponse.json({
    ok: true,
    booking: updated,
    policy,
    refund,
  });
}
