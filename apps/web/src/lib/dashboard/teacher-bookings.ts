import type { PrismaClient } from "@/generated/prisma/client";
import { slotHoldingBookingWhere } from "@/lib/pending-booking-hold";
import { groupBookingsForDashboard } from "@/lib/dashboard/booking-groups";
import { sortTeacherCompletedBookings } from "@/lib/dashboard/sort-completed-bookings";
import { excludeArchivedStudents } from "@/lib/dashboard/exclude-archived-students";
import { buildScheduleItems, type ScheduleSourceBooking } from "@/lib/dashboard/schedule-items";

type TeacherScheduleBooking = ScheduleSourceBooking & {
  groupLessonSessionId?: string | null;
  student: {
    name: string | null;
    email: string | null;
  };
};

/**
 * A teacher's own students, by the class they share.
 *
 * Built from the bookings already in hand rather than a second query: the
 * dialog for a group class lists who is in it, and the teacher is entitled to
 * see that for their own class. Cancelled seats are left out — the point of the
 * list is who will actually be in the room.
 */
function classmatesByGroupSession(bookings: readonly TeacherScheduleBooking[]) {
  const byGroup = new Map<string, string[]>();
  for (const b of bookings) {
    if (!b.groupLessonSessionId || b.status === "CANCELLED") continue;
    const name = b.student.name ?? b.student.email ?? "";
    const names = byGroup.get(b.groupLessonSessionId);
    if (names) names.push(name);
    else byGroup.set(b.groupLessonSessionId, [name]);
  }
  return byGroup;
}

export function buildTeacherScheduleItems(
  bookings: TeacherScheduleBooking[],
  { past = false, now }: { past?: boolean; now?: Date } = {},
) {
  const classmates = classmatesByGroupSession(bookings);
  return buildScheduleItems(bookings, {
    past,
    now,
    counterpartName: (b) => b.student.name ?? b.student.email ?? "",
    classmates: (b) =>
      b.groupLessonSessionId ? classmates.get(b.groupLessonSessionId) : undefined,
  });
}

export async function getTeacherBookingsForDashboard(prisma: PrismaClient, teacherProfileId: string) {
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { id: teacherProfileId },
    select: { userId: true },
  });
  if (!teacherProfile) {
    return { bookings: [], upcoming: [], completed: [], refunded: [], scheduleItems: [] };
  }

  const bookings = await prisma.booking.findMany({
    where: {
      teacherId: teacherProfileId,
      student: {
        chatThreadsAsStudent: {
          none: {
            teacherId: teacherProfile.userId,
            studentBlockedAt: { not: null },
          },
        },
      },
    },
    orderBy: { startsAt: "asc" },
    include: {
      lessonProduct: true,
      student: {
        include: {
          studentProfile: {
            select: {
              learningGoals: true,
            },
          },
        },
      },
      invoice: true,
      // The class this booking is a seat in, so the calendar can say "Group
      // 2/5" instead of naming one student for a lesson with several.
      groupLessonSession: {
        select: {
          id: true,
          capacity: true,
          _count: { select: { bookings: { where: slotHoldingBookingWhere() } } },
        },
      },
      /*
        Every refund, not only settled ones: a refund in flight is exactly when
        both parties want to look, and filtering here hid the lesson until the
        money landed. The row says which state it is in and withholds the
        documents until there is something to document.
      */
      refunds: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          creditNoteNo: true,
          amountYen: true,
          createdAt: true,
        },
      },
    },
  });

  // Archived students are filtered out of the history only. Deliberately not
  // part of the query above: that would also strip their upcoming lessons from
  // the schedule and the calendar, and a lesson you have agreed to teach must
  // not disappear because you tidied your student list.
  const archived = await prisma.teacherRosterEntry.findMany({
    where: { teacherId: teacherProfileId, archivedAt: { not: null } },
    select: { studentId: true },
  });
  const archivedStudentIds = new Set(
    archived.map((entry) => entry.studentId).filter((id): id is string => id !== null),
  );

  const now = new Date();
  const { upcoming, completed, refunded } = groupBookingsForDashboard(bookings, now);
  const completedSorted = sortTeacherCompletedBookings(
    excludeArchivedStudents(completed, archivedStudentIds),
  );
  // The calendar is a record, not just a plan: a teacher looking back at last
  // month needs to see the lessons they taught, not an empty grid. Past lessons
  // use the archive-filtered set so the calendar and the completed history agree
  // — archiving a student should not leave their lessons visible on one surface
  // and hidden on the other. Upcoming stays unfiltered, for the reason above.
  const scheduleItems = [
    ...buildTeacherScheduleItems(upcoming, { now }),
    ...buildTeacherScheduleItems(completedSorted, { past: true, now }),
  ];

  return {
    bookings,
    upcoming,
    completed: completedSorted,
    // A refunded lesson is still the teacher's record even when the student
    // has been archived: it is money that moved, and their books need it.
    refunded,
    scheduleItems,
  };
}
