import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { BookingStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { evaluateBookingCancellationPolicy } from "@/lib/booking-policy";
import { deleteMeetLessonEvent } from "@/lib/google-calendar";

type Props = {
  params: Promise<{ bookingId: string }>;
};

function resolveCancellationActor(
  role: string,
  userId: string,
  booking: { studentId: string; teacherUserId: string },
): "STUDENT" | "TEACHER" | "ADMIN" | null {
  if (role === "ADMIN") return "ADMIN";
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
      teacher: {
        select: {
          userId: true,
          googleCalendarRefreshToken: true,
          calendarId: true,
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

  await Promise.all([
    booking.googleEventId
      ? deleteMeetLessonEvent({
          organizerUserId: booking.teacher.userId,
          refreshTokenEncrypted: booking.teacher.googleCalendarRefreshToken,
          calendarId: booking.googleCalendarId ?? booking.teacher.calendarId,
          eventId: booking.googleEventId,
        })
      : Promise.resolve(false),
    booking.studentGoogleEventId
      ? deleteMeetLessonEvent({
          organizerUserId: booking.studentId,
          refreshTokenEncrypted: null,
          eventId: booking.studentGoogleEventId,
        })
      : Promise.resolve(false),
  ]);

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/dashboard`);
    revalidatePath(`/${locale}/dashboard/schedule`);
  }

  return NextResponse.json({
    ok: true,
    booking: updated,
    policy,
  });
}
