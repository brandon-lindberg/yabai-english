/**
 * What a reservation chip says it is with.
 *
 * A chip has room for a time and one line about it. That line names the other
 * person — except for a group class, which has no single person to name and
 * says how full it is instead.
 *
 * Shared because the calendars kept growing their own copy: the time grids, the
 * month grid and the two dashboard schedules each built this themselves, and
 * only some of them learned about group classes, so the same booking read
 * "Kana Miura" in one view and "Group 2/5" in another.
 */
export function bookingChipWho(
  booking: {
    counterpartLabel: string;
    groupSeats?: { capacity: number; taken: number } | null;
  },
  groupLabel: (seats: { capacity: number; taken: number }) => string,
): string {
  return booking.groupSeats ? groupLabel(booking.groupSeats) : booking.counterpartLabel;
}
