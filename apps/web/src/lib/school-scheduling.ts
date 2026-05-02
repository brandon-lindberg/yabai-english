import {
  expandRecurringOccurrencesInRange,
  type OccurrenceInRange,
  type RecurrenceRule,
} from "@/lib/recurring-slot-occurrences";
import { schoolScheduleSlotInputSchema } from "@/lib/school-schedule-slot";

/** Minimum slot shape for occurrence generation (supports all recurrence patterns). */
export type SlotForOccurrences = RecurrenceRule;

export type Occurrence = OccurrenceInRange;

export interface SlotValidationInput {
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  durationMin: number;
  capacity: number;
}

export interface SlotValidationResult {
  valid: boolean;
  error?: string;
}

export interface CapacityDisplay {
  enrolled: number;
  capacity: number;
  remaining: number;
  isFull: boolean;
  label: string;
}

/**
 * Validate schedule slot time/capacity parameters.
 *
 * Thin wrapper around `schoolScheduleSlotInputSchema` that maps the first
 * Zod issue back to a legacy `{valid, error}` shape so existing callers and
 * route assertions keep working. New code should prefer the schema directly.
 */
export function validateSlotTimes(
  input: SlotValidationInput,
): SlotValidationResult {
  const parsed = schoolScheduleSlotInputSchema.safeParse(input);
  if (parsed.success) return { valid: true };
  const first = parsed.error.issues[0];
  return { valid: false, error: legacyMessageForIssue(first, input) };
}

function legacyMessageForIssue(
  issue: { path: (string | number)[]; message: string },
  input: SlotValidationInput,
): string {
  const field = issue.path[0];
  if (field === "dayOfWeek") return "dayOfWeek must be 0-6";
  if (field === "startMin" && input.startMin < 0) {
    return "start and end minutes must be non-negative";
  }
  if (field === "endMin") {
    if (input.endMin < 0) return "start and end minutes must be non-negative";
    if (input.endMin > 1440) return "end minutes must not exceed 1440 (24 hours)";
    return "start must be before end";
  }
  if (field === "durationMin") return "duration must be at least 1 minute";
  if (field === "capacity") return "capacity must be at least 1";
  return issue.message;
}

/**
 * Generate all weekly occurrences of a slot within a date range.
 * Returns UTC ISO timestamps for each occurrence.
 *
 * Thin wrapper around the shared `expandWeeklyOccurrencesInRange` so the
 * weekly time-of-day → UTC math lives in one place (also used by the
 * marketplace `buildUpcomingSlotOptions`).
 */
export function generateOccurrences(
  slot: SlotForOccurrences,
  rangeStart: Date,
  rangeEnd: Date,
): Occurrence[] {
  return expandRecurringOccurrencesInRange(slot, rangeStart, rangeEnd);
}

/**
 * Check if an occurrence is in the skip list.
 */
export function isOccurrenceSkipped(
  skips: { startsAtIso: string }[],
  startsAtIso: string,
): boolean {
  return skips.some((s) => s.startsAtIso === startsAtIso);
}

export interface SlotForConflict extends SlotForOccurrences {
  skips: { startsAtIso: string }[];
}

export interface SlotForMaterialize extends SlotForOccurrences {
  id: string;
  durationMin: number;
  skips: { startsAtIso: string }[];
}

export interface MaterializedBookingPlan {
  scheduleSlotId: string;
  startsAtIso: string;
  endsAtIso: string;
}

/**
 * Compute which SchoolBooking rows need to be created for a slot's
 * occurrences in a date range, excluding skipped occurrences and
 * occurrences that are already materialized.
 */
export function planMaterializedBookings(
  slot: SlotForMaterialize,
  existing: { startsAtIso: string }[],
  rangeStart: Date,
  rangeEnd: Date,
): MaterializedBookingPlan[] {
  const existingSet = new Set(existing.map((b) => b.startsAtIso));
  const occurrences = generateOccurrences(slot, rangeStart, rangeEnd);
  const plans: MaterializedBookingPlan[] = [];
  for (const occ of occurrences) {
    if (isOccurrenceSkipped(slot.skips, occ.startsAtIso)) continue;
    if (existingSet.has(occ.startsAtIso)) continue;
    plans.push({
      scheduleSlotId: slot.id,
      startsAtIso: occ.startsAtIso,
      endsAtIso: occ.endsAtIso,
    });
  }
  return plans;
}

/**
 * Given a teacher's assigned school slots and a target time window,
 * return the first occurrence that overlaps the window (excluding skips),
 * or null if no conflict.
 */
export function findOccurrenceConflict(
  slots: SlotForConflict[],
  windowStart: Date,
  windowEnd: Date,
): Occurrence | null {
  for (const slot of slots) {
    const occurrences = generateOccurrences(slot, windowStart, windowEnd);
    for (const occ of occurrences) {
      if (isOccurrenceSkipped(slot.skips, occ.startsAtIso)) continue;
      const occStart = new Date(occ.startsAtIso);
      const occEnd = new Date(occ.endsAtIso);
      if (occStart < windowEnd && occEnd > windowStart) {
        return occ;
      }
    }
  }
  return null;
}

/**
 * Build capacity display info for a class slot.
 */
export function getCapacityDisplay(
  enrolled: number,
  capacity: number,
): CapacityDisplay {
  const remaining = Math.max(0, capacity - enrolled);
  return {
    enrolled,
    capacity,
    remaining,
    isFull: remaining === 0,
    label: `${enrolled}/${capacity}`,
  };
}
