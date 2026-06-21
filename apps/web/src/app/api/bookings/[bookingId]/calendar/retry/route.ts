import { NextResponse } from "next/server";
import { BookingStatus } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createMeetLessonEvent } from "@/lib/google-calendar";

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
      student: { select: { email: true } },
      teacher: {
        include: {
          user: { select: { email: true } },
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canRetry =
    booking.teacher.userId === session.user.id ||
    session.user.role === "SUPER_ADMIN";
  if (!canRetry) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    return NextResponse.json(
      { error: "Booking is not active" },
      { status: 409 },
    );
  }

  if (booking.googleEventId) {
    return NextResponse.json({
      ok: true,
      alreadyCreated: true,
      meetUrl: booking.meetUrl,
      googleEventId: booking.googleEventId,
    });
  }

  const attendeeEmails = [
    booking.student.email,
    booking.teacher.user.email,
  ].filter(Boolean) as string[];
  const meet = await createMeetLessonEvent({
    organizerUserId: booking.teacher.userId,
    refreshTokenEncrypted: booking.teacher.googleCalendarRefreshToken,
    calendarId: booking.teacher.calendarId,
    summary: `Lesson — ${booking.lessonProduct.nameEn}`,
    start: booking.startsAt,
    end: booking.endsAt,
    attendeeEmails,
  });

  if (!meet.googleEventId) {
    return NextResponse.json(
      {
        error: "Calendar invite was not created",
        code: meet.errorCode ?? "CALENDAR_CREATE_FAILED",
        message:
          meet.errorMessage ??
          "Reconnect Google Calendar and try creating the invite again.",
      },
      { status: 424 },
    );
  }

  const meetCode = meet.meetUrl ? meet.meetUrl.split("/").pop() ?? null : null;
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      meetUrl: meet.meetUrl,
      googleEventId: meet.googleEventId,
      googleCalendarId: booking.teacher.calendarId ?? "primary",
      meetCode,
    },
    select: {
      id: true,
      meetUrl: true,
      googleEventId: true,
      googleCalendarId: true,
    },
  });

  return NextResponse.json({ ok: true, booking: updated });
}
