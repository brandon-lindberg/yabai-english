import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createMeetLessonEvent } from "@/lib/google-calendar";
import { buildInvoiceNumber } from "@/lib/invoices";
import { createUserNotification } from "@/lib/notifications";
import { ensureStudentTeacherThread } from "@/lib/chat-threads";

type Props = {
  params: Promise<{ bookingId: string }>;
};

export async function POST(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      lessonProduct: true,
      teacher: { include: { user: true } },
      student: true,
    },
  });

  if (!booking || booking.studentId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (booking.status !== BookingStatus.PENDING_PAYMENT) {
    return NextResponse.json({ error: "Booking is not pending payment" }, { status: 409 });
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: BookingStatus.CONFIRMED },
    include: {
      lessonProduct: true,
      teacher: { include: { user: true } },
      student: true,
    },
  });

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
    },
  });

  const studentMirrorEvent = await createMeetLessonEvent({
    organizerUserId: session.user.id,
    refreshTokenEncrypted: null,
    calendarId: "primary",
    summary: `Lesson — ${updated.lessonProduct.nameEn}`,
    start: updated.startsAt,
    end: updated.endsAt,
    attendeeEmails,
    createMeetLink: false,
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
      studentId: session.user.id,
      amountYen: finalBooking.quotedPriceYen,
      invoiceNo: buildInvoiceNumber(now),
      paidAt: now,
    },
    update: {
      amountYen: finalBooking.quotedPriceYen,
      paidAt: now,
    },
  });

  await ensureStudentTeacherThread(session.user.id, updated.teacher.userId);
  await createUserNotification({
    userId: session.user.id,
    titleJa: "支払いが完了しました",
    titleEn: "Payment completed",
    bodyJa: "予約が確定されました。",
    bodyEn: "Your booking is now confirmed.",
  });

  return NextResponse.json(finalBooking);
}
