import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { evaluateBookingReschedulePolicy } from "@/lib/booking-reschedule";
import { validateBookingAgainstTeacherAvailability } from "@/lib/booking-slot-validation";
import { dateOnlyInZone } from "@/lib/date-only-in-zone";
import { patchMeetLessonEvent } from "@/lib/google-calendar";

type Props = { params: Promise<{ bookingId: string }> };

const bodySchema = z.object({ startsAt: z.string().datetime() });

function resolveActor(
  role: string,
  userId: string,
  booking: { studentId: string; teacher: { userId: string } },
): "STUDENT" | "TEACHER" | "SUPER_ADMIN" | null {
  if (role === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (role === "STUDENT" && booking.studentId === userId) return "STUDENT";
  if (role === "TEACHER" && booking.teacher.userId === userId) return "TEACHER";
  return null;
}

/**
 * Moves a paid lesson to a new time.
 *
 * The booking keeps its payment — nothing is refunded and nothing re-charged —
 * so this is the answer to `rescheduleOffered`, where a student inside the
 * 48-hour window would otherwise simply lose the fee.
 *
 * No teacher approval step: the new time has to be a slot the teacher already
 * published, so agreeing to it is implicit in having published it.
 */
export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      lessonProduct: { select: { durationMin: true } },
      student: { select: { studentProfile: { select: { timezone: true } } } },
      teacher: {
        select: {
          id: true,
          userId: true,
          calendarId: true,
          googleCalendarRefreshToken: true,
          availabilitySlots: {
            where: { active: true },
            select: {
              id: true,
              dayOfWeek: true,
              startMin: true,
              endMin: true,
              timezone: true,
              recurrence: true,
              startsOn: true,
              endsOn: true,
              classLevelId: true,
              classTypeId: true,
            },
          },
          availabilityOccurrenceSkips: { select: { startsAtIso: true } },
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const actor = resolveActor(session.user.role, session.user.id, booking);
  if (!actor) {
    // A student asking about someone else's booking learns nothing from a 404.
    if (session.user.role === "STUDENT") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const policy = evaluateBookingReschedulePolicy({
    actor,
    bookingStatus: booking.status,
    lessonStartsAt: booking.startsAt,
    rescheduleCount: booking.rescheduleCount,
  });
  if (!policy.allowed) {
    return NextResponse.json(
      { error: "This lesson cannot be rescheduled.", reason: policy.reason },
      { status: 409 },
    );
  }

  const start = new Date(parsed.data.startsAt);
  const durationMin = booking.lessonProduct.durationMin;
  const endsAt = new Date(start.getTime() + durationMin * 60 * 1000);

  // The same check that governs booking in the first place — a rescheduled
  // lesson has to land somewhere the teacher actually offers.
  const slotValidation = validateBookingAgainstTeacherAvailability({
    startsAtIso: start.toISOString(),
    durationMin,
    availabilitySlots: booking.teacher.availabilitySlots.map((slot) => ({
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      startMin: slot.startMin,
      endMin: slot.endMin,
      timezone: slot.timezone,
      recurrence: slot.recurrence,
      startsOn: dateOnlyInZone(slot.startsOn, slot.timezone),
      endsOn: dateOnlyInZone(slot.endsOn, slot.timezone),
      classLevelId: slot.classLevelId,
      classTypeId: slot.classTypeId,
    })),
    occurrenceSkips: booking.teacher.availabilityOccurrenceSkips.map((s) => s.startsAtIso),
    viewerTimezone: booking.student.studentProfile?.timezone ?? "Asia/Tokyo",
  });
  if (!slotValidation.ok) {
    return NextResponse.json({ error: slotValidation.error }, { status: 409 });
  }

  const clash = await prisma.booking.findFirst({
    where: {
      id: { not: booking.id },
      teacherId: booking.teacher.id,
      status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
      startsAt: { lt: endsAt },
      endsAt: { gt: start },
    },
    select: { id: true },
  });
  if (clash) {
    return NextResponse.json(
      { error: "The teacher already has a lesson at that time." },
      { status: 409 },
    );
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      startsAt: start,
      endsAt,
      rescheduleCount: booking.rescheduleCount + 1,
    },
    select: { id: true, startsAt: true, endsAt: true, rescheduleCount: true },
  });

  // Best-effort: a calendar left on the old time is worse than no calendar, but
  // it must not fail the move the student has already been told happened.
  if (booking.googleEventId) {
    await patchMeetLessonEvent({
      organizerUserId: booking.teacher.userId,
      refreshTokenEncrypted: booking.teacher.googleCalendarRefreshToken,
      calendarId: booking.googleCalendarId ?? booking.teacher.calendarId,
      eventId: booking.googleEventId,
      start,
      end: endsAt,
    });
  }
  if (booking.studentGoogleEventId) {
    await patchMeetLessonEvent({
      organizerUserId: booking.studentId,
      refreshTokenEncrypted: null,
      eventId: booking.studentGoogleEventId,
      start,
      end: endsAt,
    });
  }

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/dashboard`);
    revalidatePath(`/${locale}/dashboard/schedule`);
  }

  return NextResponse.json({ ok: true, booking: updated });
}
