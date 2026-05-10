export type SchoolBookingRescheduleDenyReason = "NEW_START_IN_PAST_OR_PRESENT";

/**
 * Time-window checks for rescheduling a materialized school class instance.
 */
export function evaluateSchoolBookingRescheduleTimes(input: {
  previousStartsAt: Date;
  newStartsAt: Date;
  now?: Date;
}):
  | { ok: true; unchanged: boolean }
  | { ok: false; reason: SchoolBookingRescheduleDenyReason } {
  const now = input.now ?? new Date();
  if (input.newStartsAt.getTime() <= now.getTime()) {
    return { ok: false, reason: "NEW_START_IN_PAST_OR_PRESENT" };
  }
  const unchanged =
    input.newStartsAt.getTime() === input.previousStartsAt.getTime();
  return { ok: true, unchanged };
}
