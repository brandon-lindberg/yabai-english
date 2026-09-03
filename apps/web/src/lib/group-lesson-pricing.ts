import {
  MIN_PUBLIC_LESSON_RATE_YEN,
  validatePublicLessonRateYen,
} from "@/lib/lesson-rate-policy";

/**
 * A teacher prices a group class as a whole; students each pay a share of it.
 *
 * The stored `TeacherLessonOffering.rateYen` keeps the meaning it has
 * everywhere else — what one student pays — and the teacher's own figure is
 * kept beside it in `groupTotalRateYen`. So the division happens here, once, on
 * the way in, and no pricing, invoice, payment or refund path has to know that
 * a group class was involved at all.
 *
 * Everything here takes tax-included yen. Converting what the teacher typed
 * into a tax-included figure is `taxIncludedRateFromTeacherInput`'s job, and
 * callers do that first rather than this module doing tax arithmetic twice.
 */

/** Two is the smallest thing that is a group rather than a private lesson. */
export const MIN_GROUP_CAPACITY = 2;

function assertCapacity(capacity: number): void {
  if (!Number.isInteger(capacity) || capacity < MIN_GROUP_CAPACITY) {
    throw new Error(
      `Group capacity must be a whole number of at least ${MIN_GROUP_CAPACITY}.`,
    );
  }
}

/**
 * What one seat costs, rounded up.
 *
 * Up rather than down: flooring an uneven split leaves the teacher short of the
 * total they themselves asked for once the class fills, and rounds toward the
 * public minimum rather than away from it.
 */
export function perStudentRateYen(groupTotalYen: number, capacity: number): number {
  assertCapacity(capacity);
  return Math.ceil(groupTotalYen / capacity);
}

/**
 * What a full class actually collects. Not the inverse of the split — an
 * uneven division rounds up, so this can exceed the total the teacher entered.
 * The form shows both figures side by side for exactly that reason.
 */
export function collectedWhenFullYen(perStudentYen: number, capacity: number): number {
  return perStudentYen * capacity;
}

/**
 * The total at which every seat pays exactly the public floor — the round
 * figure to show a teacher ("¥15,000 for 5 students"), not the validator's
 * threshold. Because the share rounds up, a total of a few yen less can still
 * clear the floor; the rule is the share, and `validateGroupOfferingRate` is
 * the only thing that decides.
 */
export function groupTotalAtFloorYen(capacity: number): number {
  return capacity * MIN_PUBLIC_LESSON_RATE_YEN;
}

export type GroupOfferingRateValidation =
  | { ok: true; perStudentYen: number; collectedWhenFullYen: number }
  | {
      ok: false;
      reason: "INVALID_CAPACITY" | "INVALID_TOTAL" | "BELOW_PUBLIC_MINIMUM";
      error: string;
      /** Present on BELOW_PUBLIC_MINIMUM: what the seat would have cost. */
      perStudentYen?: number;
      /** Present on BELOW_PUBLIC_MINIMUM: the round total to suggest instead. */
      totalAtFloorYen?: number;
    };

/**
 * Whether a teacher may publish this group class.
 *
 * The ¥3,000 public minimum is held against the **per-student share**, not the
 * teacher's total: ¥8,000 is a legal lesson price on its own, but ¥2,000 a seat
 * is not. That is the whole reason this cannot just call
 * `validatePublicLessonRateYen` on what the teacher typed.
 *
 * Failures come back as a reason plus the figures behind it. The teacher's form
 * renders its own translated copy from those and never shows `error`, which
 * exists for API responses and logs.
 */
export function validateGroupOfferingRate({
  groupTotalYen,
  capacity,
}: {
  groupTotalYen: number;
  capacity: number;
}): GroupOfferingRateValidation {
  if (!Number.isInteger(capacity) || capacity < MIN_GROUP_CAPACITY) {
    return {
      ok: false,
      reason: "INVALID_CAPACITY",
      error: `A group class needs at least ${MIN_GROUP_CAPACITY} seats.`,
    };
  }
  if (!Number.isInteger(groupTotalYen) || groupTotalYen <= 0) {
    return {
      ok: false,
      reason: "INVALID_TOTAL",
      error: "Enter the total price for the class in whole yen.",
    };
  }

  const perStudentYen = perStudentRateYen(groupTotalYen, capacity);
  if (!validatePublicLessonRateYen(perStudentYen).ok) {
    const totalAtFloorYen = groupTotalAtFloorYen(capacity);
    return {
      ok: false,
      reason: "BELOW_PUBLIC_MINIMUM",
      perStudentYen,
      totalAtFloorYen,
      error:
        `Each student would pay ¥${perStudentYen.toLocaleString("en-US")}. ` +
        `A class of ${capacity} needs a total of about ` +
        `¥${totalAtFloorYen.toLocaleString("en-US")}.`,
    };
  }

  return {
    ok: true,
    perStudentYen,
    collectedWhenFullYen: collectedWhenFullYen(perStudentYen, capacity),
  };
}
