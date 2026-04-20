import { DateTime } from "luxon";

/** Minimum slot shape for occurrence generation. */
export interface SlotForOccurrences {
  dayOfWeek: number; // 0-6 (Sun-Sat)
  startMin: number; // minutes from midnight
  endMin: number; // minutes from midnight
  timezone: string;
}

export interface Occurrence {
  startsAtIso: string;
  endsAtIso: string;
}

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
 */
export function validateSlotTimes(
  input: SlotValidationInput,
): SlotValidationResult {
  if (input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    return { valid: false, error: "dayOfWeek must be 0-6" };
  }
  if (input.startMin < 0 || input.endMin < 0) {
    return { valid: false, error: "start and end minutes must be non-negative" };
  }
  if (input.endMin > 1440) {
    return {
      valid: false,
      error: "end minutes must not exceed 1440 (24 hours)",
    };
  }
  if (input.startMin >= input.endMin) {
    return { valid: false, error: "start must be before end" };
  }
  if (input.durationMin < 1) {
    return { valid: false, error: "duration must be at least 1 minute" };
  }
  if (input.capacity < 1) {
    return { valid: false, error: "capacity must be at least 1" };
  }
  return { valid: true };
}

/**
 * Generate all weekly occurrences of a slot within a date range.
 * Returns UTC ISO timestamps for each occurrence.
 */
export function generateOccurrences(
  slot: SlotForOccurrences,
  rangeStart: Date,
  rangeEnd: Date,
): Occurrence[] {
  const occurrences: Occurrence[] = [];

  // Luxon uses ISO weekday: 1=Mon...7=Sun
  // Our dayOfWeek: 0=Sun, 1=Mon...6=Sat
  const luxonWeekday = slot.dayOfWeek === 0 ? 7 : slot.dayOfWeek;

  const zoneStart = DateTime.fromJSDate(rangeStart, { zone: slot.timezone });
  const zoneEnd = DateTime.fromJSDate(rangeEnd, { zone: slot.timezone });

  // Find the first occurrence of the target weekday at or after rangeStart
  let current = zoneStart.startOf("day");
  while (current.weekday !== luxonWeekday) {
    current = current.plus({ days: 1 });
  }

  while (current <= zoneEnd) {
    const startHour = Math.floor(slot.startMin / 60);
    const startMinute = slot.startMin % 60;
    const endHour = Math.floor(slot.endMin / 60);
    const endMinute = slot.endMin % 60;

    const occStart = current.set({
      hour: startHour,
      minute: startMinute,
      second: 0,
      millisecond: 0,
    });
    const occEnd = current.set({
      hour: endHour,
      minute: endMinute,
      second: 0,
      millisecond: 0,
    });

    if (occStart >= zoneStart && occStart <= zoneEnd) {
      occurrences.push({
        startsAtIso: occStart.toUTC().toISO()!,
        endsAtIso: occEnd.toUTC().toISO()!,
      });
    }

    current = current.plus({ weeks: 1 });
  }

  return occurrences;
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
