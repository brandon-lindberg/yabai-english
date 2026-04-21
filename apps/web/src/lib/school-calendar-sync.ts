import { prisma } from "@/lib/prisma";
import { createMeetLessonEvent } from "@/lib/google-calendar";

/**
 * For each SchoolBooking in [schoolId, rangeStart..rangeEnd] that lacks
 * a googleEventId, attempt to create a Google Calendar event with a Meet
 * link and persist the result. Uses allSettled so a single failure does
 * not affect the others.
 */
export async function syncSchoolBookingsToCalendar(
  schoolId: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<void> {
  const unscheduled = await prisma.schoolBooking.findMany({
    where: {
      schoolId,
      googleEventId: null,
      startsAt: { gte: rangeStart, lte: rangeEnd },
    },
    include: {
      school: { select: { name: true } },
      teacherMembership: {
        select: {
          user: { select: { id: true, email: true } },
        },
      },
      attendees: {
        select: {
          studentMembership: {
            select: { user: { select: { email: true } } },
          },
        },
      },
    },
  });

  if (unscheduled.length === 0) return;

  await Promise.allSettled(
    unscheduled.map(async (booking) => {
      const organizerUserId = booking.teacherMembership?.user?.id;
      if (!organizerUserId) return;

      const attendeeEmails = booking.attendees
        .map((a) => a.studentMembership?.user?.email)
        .filter((e): e is string => Boolean(e));

      const result = await createMeetLessonEvent({
        organizerUserId,
        refreshTokenEncrypted: null,
        summary: `${booking.school?.name ?? "School"} class`,
        start: booking.startsAt,
        end: booking.endsAt,
        attendeeEmails,
        createMeetLink: true,
      });

      if (result.googleEventId) {
        await prisma.schoolBooking.update({
          where: { id: booking.id },
          data: {
            googleEventId: result.googleEventId,
            meetUrl: result.meetUrl,
          },
        });
      }
    }),
  );
}
