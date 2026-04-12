import { DateTime } from "luxon";

/** One calendar month after the last completed placement before a new attempt is allowed. */
export function placementRetakeEligibleAt(completedAt: Date): Date {
  return DateTime.fromJSDate(completedAt, { zone: "utc" }).plus({ months: 1 }).toJSDate();
}

/** `true` when the user may start placement (first attempt, or cooldown has passed). */
export function isPlacementRetakeAllowed(completedAt: Date | null | undefined): boolean {
  if (!completedAt) return true;
  return Date.now() >= placementRetakeEligibleAt(completedAt).getTime();
}
