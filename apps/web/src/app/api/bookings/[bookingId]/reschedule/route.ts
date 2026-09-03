import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { evaluateBookingReschedulePolicy } from "@/lib/booking-reschedule";
import { validateBookingAgainstTeacherAvailability } from "@/lib/booking-slot-validation";
import { dateOnlyInZone } from "@/lib/date-only-in-zone";
import {
  addMeetLessonEventAttendee,
  patchMeetLessonEvent,
  removeMeetLessonEventAttendee,
} from "@/lib/google-calendar";
import { bookingOwnsItsCalendarEvent } from "@/lib/booking-calendar-ownership";
import { GroupClassFullError, reserveGroupSeat } from "@/lib/group-lesson-session";
import { teacherBookingOverlapWhere } from "@/lib/booking-conflict";
import { visibleAvailabilitySlots } from "@/lib/assigned-availability";

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
      student: {
      select: { email: true, studentProfile: { select: { timezone: true } } },
    },
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
              assignedStudentId: true,
              teacherLessonOfferingId: true,
              teacherLessonOffering: {
                select: { id: true, isGroup: true, groupSize: true },
              },
            },
          },
          availabilityOccurrenceSkips: { select: { slotId: true, startsAtIso: true } },
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
    // Same rule as booking: a time reserved for someone else is not somewhere
    // this student may move their lesson to.
    availabilitySlots: visibleAvailabilitySlots(
      booking.teacher.availabilitySlots,
      booking.studentId,
    ).map((slot) => ({
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
    occurrenceSkips: booking.teacher.availabilityOccurrenceSkips,
    viewerTimezone: booking.student.studentProfile?.timezone ?? "Asia/Tokyo",
  });
  if (!slotValidation.ok) {
    return NextResponse.json({ error: slotValidation.error }, { status: 409 });
  }

  // Where the lesson is landing decides whether this is a seat in a class.
  // The destination governs, not where the booking came from: a student can
  // move out of a class into a private lesson and back again.
  const targetSlot = booking.teacher.availabilitySlots.find(
    (slot) => slot.id === slotValidation.slotId,
  );
  const targetOffering = targetSlot?.teacherLessonOffering ?? null;
  const targetCapacity =
    targetOffering?.isGroup && targetOffering.groupSize ? targetOffering.groupSize : null;

  const existingTargetSession = targetCapacity
    ? await prisma.groupLessonSession.findUnique({
        where: {
          availabilitySlotId_startsAt: {
            availabilitySlotId: slotValidation.slotId,
            startsAt: start,
          },
        },
        select: { id: true },
      })
    : null;

  const clash = await prisma.booking.findFirst({
    where: teacherBookingOverlapWhere({
      teacherId: booking.teacher.id,
      start,
      end: endsAt,
      excludeBookingId: booking.id,
      allowGroupSessionId: existingTargetSession?.id ?? null,
    }),
    select: { id: true },
  });
  if (clash) {
    return NextResponse.json(
      { error: "The teacher already has a lesson at that time." },
      { status: 409 },
    );
  }

  // Taking the new seat and moving the booking onto it happen together: a seat
  // claimed for a move that then failed would be held by nobody.
  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const groupLessonSessionId =
        targetCapacity && targetOffering
          ? await reserveGroupSeat(tx, {
              teacherId: booking.teacher.id,
              availabilitySlotId: slotValidation.slotId,
              teacherLessonOfferingId: targetOffering.id,
              startsAt: start,
              endsAt,
              capacity: targetCapacity,
            })
          : null;

      return tx.booking.update({
        where: { id: booking.id },
        data: {
          startsAt: start,
          endsAt,
          groupLessonSessionId,
          rescheduleCount: booking.rescheduleCount + 1,
        },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          rescheduleCount: true,
          groupLessonSessionId: true,
        },
      });
    });
  } catch (e) {
    if (e instanceof GroupClassFullError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    throw e;
  }

  // Best-effort: a calendar left on the old time is worse than no calendar, but
  // it must not fail the move the student has already been told happened.
  const teacherCalendar = {
    organizerUserId: booking.teacher.userId,
    refreshTokenEncrypted: booking.teacher.googleCalendarRefreshToken,
    calendarId: booking.googleCalendarId ?? booking.teacher.calendarId,
  };
  if (booking.googleEventId) {
    if (bookingOwnsItsCalendarEvent(booking)) {
      await patchMeetLessonEvent({
        ...teacherCalendar,
        eventId: booking.googleEventId,
        start,
        end: endsAt,
      });
    } else if (booking.student.email) {
      // The event belongs to the class this student is leaving. Moving it would
      // drag every classmate to the new time, so they step off the guest list
      // instead; the class they are joining adds them on its own confirmation.
      await removeMeetLessonEventAttendee({
        ...teacherCalendar,
        eventId: booking.googleEventId,
        attendeeEmail: booking.student.email,
      });
    }
  }

  // The class it has joined may already be meeting somewhere, in which case
  // this student goes on its guest list. A class with no event yet gets one on
  // its first confirmation, with this student already on it.
  const joinedSession = updated.groupLessonSessionId
    ? await prisma.groupLessonSession.findUnique({
        where: { id: updated.groupLessonSessionId },
        select: { googleEventId: true, googleCalendarId: true },
      })
    : null;
  if (joinedSession?.googleEventId && booking.student.email) {
    await addMeetLessonEventAttendee({
      ...teacherCalendar,
      calendarId: joinedSession.googleCalendarId ?? booking.teacher.calendarId,
      eventId: joinedSession.googleEventId,
      attendeeEmail: booking.student.email,
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
