import type { PrismaClient } from "@/generated/prisma/client";
import { groupBookingsForDashboard } from "@/lib/dashboard/booking-groups";
import { sortTeacherCompletedBookings } from "@/lib/dashboard/sort-completed-bookings";
import { excludeArchivedStudents } from "@/lib/dashboard/exclude-archived-students";

type TeacherScheduleBooking = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  lessonProduct: {
    nameJa: string;
    nameEn: string;
  };
  student: {
    name: string | null;
    email: string | null;
    studentProfile?: {
      learningGoals: string[];
    } | null;
  };
};

export function buildTeacherScheduleItems(bookings: TeacherScheduleBooking[]) {
  return bookings.map((b) => ({
    id: b.id,
    startsAtIso: b.startsAt.toISOString(),
    endsAtIso: b.endsAt.toISOString(),
    title: `${b.lessonProduct.nameJa} / ${b.lessonProduct.nameEn}`,
    teacherName: b.student.name ?? b.student.email ?? "",
  }));
}

export async function getTeacherBookingsForDashboard(prisma: PrismaClient, teacherProfileId: string) {
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { id: teacherProfileId },
    select: { userId: true },
  });
  if (!teacherProfile) {
    return { bookings: [], upcoming: [], completed: [], scheduleItems: [] };
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
  const { upcoming, completed } = groupBookingsForDashboard(bookings, now);
  const completedSorted = sortTeacherCompletedBookings(
    excludeArchivedStudents(completed, archivedStudentIds),
  );
  const scheduleItems = buildTeacherScheduleItems(upcoming);

  return { bookings, upcoming, completed: completedSorted, scheduleItems };
}
