import { BookingStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createMeetLessonEvent } from "@/lib/google-calendar";
import { buildInvoiceNumber } from "@/lib/invoices";
import { createUserNotification } from "@/lib/notifications";
import { ensureStudentTeacherThread } from "@/lib/chat-threads";
import { buildTeacherBookingConfirmedNotification } from "@/lib/booking-notifications";
import { syncTeacherRosterAfterStudentBooking } from "@/lib/sync-teacher-roster-after-student-booking";
import { revalidateDashboardStudentRosterPaths } from "@/lib/revalidate-dashboard-roster";
import { initializeTeacherTierStateFromHistory } from "@/lib/teacher-tiers";

type MirrorLessonEventParams = {
  studentUserId: string;
  summary: string;
  startsAt: Date;
  endsAt: Date;
  attendeeEmails: string[];
};

export async function maybeCreateStudentMirrorLessonEvent({
  studentUserId,
  summary,
  startsAt,
  endsAt,
  attendeeEmails,
}: MirrorLessonEventParams) {
  const [settings, integration] = await Promise.all([
    prisma.googleIntegrationSettings.findUnique({
      where: { userId: studentUserId },
      select: { calendarConnected: true },
    }),
    prisma.googleIntegrationAccount.findUnique({
      where: { userId: studentUserId },
      select: { refreshToken: true, revoked: true },
    }),
  ]);

  if (
    settings?.calendarConnected !== true ||
    !integration?.refreshToken ||
    integration.revoked
  ) {
    return { meetUrl: null, googleEventId: null };
  }

  return createMeetLessonEvent({
    organizerUserId: studentUserId,
    refreshTokenEncrypted: null,
    calendarId: "primary",
    summary,
    start: startsAt,
    end: endsAt,
    attendeeEmails,
    createMeetLink: false,
  });
}

export async function confirmPaidBookingFromPayment(
  bookingId: string,
  options: { revalidateRoster?: boolean } = {},
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      lessonProduct: true,
      teacher: {
        include: {
          user: true,
          availabilitySlots: {
            where: { active: true },
            take: 1,
            select: { timezone: true },
          },
        },
      },
      student: true,
    },
  });

  if (!booking) {
    return { ok: false as const, reason: "NOT_FOUND" as const };
  }
  if (booking.status === BookingStatus.CONFIRMED) {
    return { ok: true as const, booking };
  }
  if (booking.status !== BookingStatus.PENDING_PAYMENT) {
    return { ok: false as const, reason: "INVALID_STATUS" as const };
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: BookingStatus.CONFIRMED },
    include: {
      lessonProduct: true,
      teacher: {
        include: {
          user: true,
          availabilitySlots: {
            where: { active: true },
            take: 1,
            select: { timezone: true },
          },
        },
      },
      student: true,
    },
  });

  await syncTeacherRosterAfterStudentBooking(prisma, {
    teacherId: booking.teacher.id,
    studentUserId: booking.studentId,
  });
  if (options.revalidateRoster !== false) {
    revalidateDashboardStudentRosterPaths();
  }

  const attendeeEmails = [updated.student.email, updated.teacher.user.email].filter(
    Boolean,
  ) as string[];
  const meet = await createMeetLessonEvent({
    organizerUserId: updated.teacher.userId,
    refreshTokenEncrypted: updated.teacher.googleCalendarRefreshToken,
    calendarId: updated.teacher.calendarId,
    summary: `Lesson — ${updated.lessonProduct.nameEn}`,
    start: updated.startsAt,
    end: updated.endsAt,
    attendeeEmails,
  });

  const finalBooking = await prisma.booking.update({
    where: { id: updated.id },
    data: {
      meetUrl: meet.meetUrl ?? updated.meetUrl,
      googleEventId: meet.googleEventId ?? updated.googleEventId,
      googleCalendarId: updated.teacher.calendarId ?? "primary",
      meetCode:
        meet.meetUrl?.split("/").pop() ??
        updated.meetUrl?.split("/").pop() ??
        null,
    },
    include: {
      lessonProduct: true,
      teacher: { include: { user: true } },
      student: true,
    },
  });

  const studentMirrorEvent = await maybeCreateStudentMirrorLessonEvent({
    studentUserId: booking.studentId,
    summary: `Lesson — ${updated.lessonProduct.nameEn}`,
    startsAt: updated.startsAt,
    endsAt: updated.endsAt,
    attendeeEmails,
  });
  if (studentMirrorEvent.googleEventId) {
    await prisma.booking.update({
      where: { id: updated.id },
      data: { studentGoogleEventId: studentMirrorEvent.googleEventId },
    });
  }

  const now = new Date();
  await prisma.invoice.upsert({
    where: { bookingId: finalBooking.id },
    create: {
      bookingId: finalBooking.id,
      studentId: booking.studentId,
      amountYen: finalBooking.quotedPriceYen,
      invoiceNo: buildInvoiceNumber(now),
      paidAt: now,
    },
    update: {
      amountYen: finalBooking.quotedPriceYen,
      paidAt: now,
    },
  });

  if ("teacherTierState" in prisma) {
    await initializeTeacherTierStateFromHistory(prisma as never, {
      teacherId: booking.teacher.id,
      paidAt: now,
    });
  }

  await ensureStudentTeacherThread(booking.studentId, updated.teacher.userId);
  await createUserNotification({
    userId: booking.studentId,
    titleJa: "支払いが完了しました",
    titleEn: "Payment completed",
    bodyJa: "予約が確定されました。",
    bodyEn: "Your booking is now confirmed.",
  });

  const teacherTimezone =
    booking.teacher.availabilitySlots[0]?.timezone ?? "Asia/Tokyo";
  const teacherNotification = buildTeacherBookingConfirmedNotification({
    studentName: updated.student.name ?? null,
    startsAt: updated.startsAt,
    timezone: teacherTimezone,
  });
  await createUserNotification({
    userId: updated.teacher.userId,
    ...teacherNotification,
  });

  return { ok: true as const, booking: finalBooking };
}
