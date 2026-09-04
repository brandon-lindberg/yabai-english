import type { PrismaClient } from "@/generated/prisma/client";
import { groupBookingsForDashboard } from "@/lib/dashboard/booking-groups";
import { sortStudentCompletedBookings } from "@/lib/dashboard/sort-completed-bookings";
import { buildScheduleItems } from "@/lib/dashboard/schedule-items";
import { slotHoldingBookingWhere } from "@/lib/pending-booking-hold";

export async function getStudentBookingsForDashboard(prisma: PrismaClient, studentId: string) {
  const bookings = await prisma.booking.findMany({
    where: { studentId },
    orderBy: { startsAt: "asc" },
    include: {
      lessonProduct: true,
      teacher: { include: { user: true } },
      invoice: true,
      // The class this booking is a seat in, so the calendar can say "Group
      // 2/5". The count is of seats still held, never of rows: a lapsed hold
      // has already given its seat back.
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

  const now = new Date();
  const { upcoming, completed, refunded } = groupBookingsForDashboard(bookings, now);
  // By teacher, then newest first — the order the grouped history relies on.
  const completedSorted = sortStudentCompletedBookings(completed);
  const counterpartName = (b: (typeof bookings)[number]) =>
    b.teacher.user.name ?? b.teacher.user.email ?? "";
  // `classmates` is deliberately not passed: a student learns that three seats
  // are taken, never by whom.
  const scheduleItems = [
    ...buildScheduleItems(upcoming, { counterpartName, now }),
    ...buildScheduleItems(completedSorted, { past: true, counterpartName, now }),
  ];

  return { bookings, upcoming, completed: completedSorted, refunded, scheduleItems };
}
