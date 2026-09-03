import type { BookingStatus } from "@/generated/prisma/client";
import {
  resolveBookingDisplayStatus,
  type BookingDisplayStatus,
} from "@/lib/booking-status";

/**
 * One mark on a dashboard schedule calendar.
 *
 * The two dashboards each had their own mapper producing the same five fields,
 * which is exactly how the teacher's calendar learned about group classes and
 * the student's did not. The chip needs a time and one line about it; the
 * reservation dialog behind the chip needs the rest — so both are built here,
 * once, and a field can only be missing on both sides or on neither.
 */
export type DashboardScheduleItem = {
  id: string;
  startsAtIso: string;
  endsAtIso: string;
  title: string;
  /** The other person in the lesson — a teacher for students, a student for teachers. */
  counterpartName: string;
  /** Already taught. Renders as a record rather than a commitment. */
  isPast: boolean;
  status: BookingDisplayStatus;
  durationMin: number;
  priceYen: number | null;
  meetUrl: string | null;
  /** Present only for a seat in a group class. */
  groupSeats: { capacity: number; taken: number } | null;
  /** Who else is in that class. Teacher-side only — see `classmates` below. */
  classmates?: string[];
};

export type ScheduleSourceBooking = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  holdExpiresAt?: Date | null;
  quotedPriceYen?: number | null;
  meetUrl?: string | null;
  lessonProduct: { nameJa: string; nameEn: string; durationMin: number };
  /**
   * The class this booking is a seat in, with its live seat tally. `_count`
   * must be the filtered count of bookings still holding a seat, so the chip
   * cannot advertise a seat that a lapsed hold already gave back.
   */
  groupLessonSession?: { capacity: number; _count: { bookings: number } } | null;
};

export function buildScheduleItems<T extends ScheduleSourceBooking>(
  bookings: readonly T[],
  {
    past = false,
    counterpartName,
    classmates,
    now = new Date(),
  }: {
    past?: boolean;
    counterpartName: (booking: T) => string;
    /**
     * Who else is in the class, for a caller entitled to know. The student side
     * simply does not pass this — omission, not a flag, is what keeps one
     * classmate's name off another classmate's calendar.
     */
    classmates?: (booking: T) => string[] | undefined;
    now?: Date;
  },
): DashboardScheduleItem[] {
  return bookings.map((b) => ({
    id: b.id,
    startsAtIso: b.startsAt.toISOString(),
    endsAtIso: b.endsAt.toISOString(),
    title: `${b.lessonProduct.nameJa} / ${b.lessonProduct.nameEn}`,
    counterpartName: counterpartName(b),
    isPast: past,
    status: resolveBookingDisplayStatus(
      { status: b.status, holdExpiresAt: b.holdExpiresAt ?? null },
      now,
    ),
    durationMin: b.lessonProduct.durationMin,
    priceYen: b.quotedPriceYen ?? null,
    meetUrl: b.meetUrl ?? null,
    groupSeats: b.groupLessonSession
      ? {
          capacity: b.groupLessonSession.capacity,
          taken: b.groupLessonSession._count.bookings,
        }
      : null,
    classmates: classmates?.(b),
  }));
}
