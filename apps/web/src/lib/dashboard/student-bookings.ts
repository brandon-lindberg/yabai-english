import type { PrismaClient } from "@/generated/prisma/client";
import { groupBookingsForDashboard } from "@/lib/dashboard/booking-groups";
import { sortStudentCompletedBookings } from "@/lib/dashboard/sort-completed-bookings";

export async function getStudentBookingsForDashboard(prisma: PrismaClient, studentId: string) {
  const bookings = await prisma.booking.findMany({
    where: { studentId },
    orderBy: { startsAt: "asc" },
    include: {
      lessonProduct: true,
      teacher: { include: { user: true } },
      invoice: true,
    },
  });

  const now = new Date();
  const { upcoming, completed } = groupBookingsForDashboard(bookings, now);
  // By teacher, then newest first — the order the grouped history relies on.
  const completedSorted = sortStudentCompletedBookings(completed);
  const scheduleItems = upcoming.map((b) => ({
    id: b.id,
    startsAtIso: b.startsAt.toISOString(),
    endsAtIso: b.endsAt.toISOString(),
    title: `${b.lessonProduct.nameJa} / ${b.lessonProduct.nameEn}`,
    teacherName: b.teacher.user.name ?? b.teacher.user.email ?? "",
  }));

  return { bookings, upcoming, completed: completedSorted, scheduleItems };
}
