import { dateOnlyInZone } from "@/lib/date-only-in-zone";
import {
  expandRecurringOccurrencesInRange,
  type RecurrencePattern,
} from "@/lib/recurring-slot-occurrences";

export type BookableAvailabilitySlot = {
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  timezone: string;
  recurrence?: RecurrencePattern | null;
  startsOn?: Date | string | null;
  endsOn?: Date | string | null;
  classTypeId?: string | null;
  teacherLessonOfferingId?: string | null;
};

export type BookableLessonOffering = {
  id: string;
  durationMin: number;
  classTypeId?: string | null;
};

type BookingAvailabilityArgs = {
  availabilitySlots: readonly BookableAvailabilitySlot[];
  startsAt: Date;
  durationMin: number;
  selectedOffering?: BookableLessonOffering | null;
  skippedStartsAtIso?: ReadonlySet<string>;
};

function dateOnly(value: Date | string | null | undefined, timezone: string): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return dateOnlyInZone(value, timezone);
}

function slotDurationMin(slot: BookableAvailabilitySlot) {
  return slot.endMin - slot.startMin;
}

function slotMatchesOffering(
  slot: BookableAvailabilitySlot,
  durationMin: number,
  selectedOffering: BookableLessonOffering | null | undefined,
) {
  if (slotDurationMin(slot) !== durationMin) return false;
  if (!selectedOffering) return true;
  if (slot.teacherLessonOfferingId) {
    return slot.teacherLessonOfferingId === selectedOffering.id;
  }
  if (slot.classTypeId && selectedOffering.classTypeId) {
    return slot.classTypeId === selectedOffering.classTypeId;
  }
  return selectedOffering.durationMin === durationMin;
}

export function bookingStartMatchesTeacherAvailability({
  availabilitySlots,
  startsAt,
  durationMin,
  selectedOffering,
  skippedStartsAtIso,
}: BookingAvailabilityArgs): boolean {
  if (!Number.isFinite(startsAt.getTime())) return false;

  const requestedStartMs = startsAt.getTime();
  const rangeStart = new Date(requestedStartMs - 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(requestedStartMs + 24 * 60 * 60 * 1000);

  return availabilitySlots.some((slot) => {
    if (!slotMatchesOffering(slot, durationMin, selectedOffering)) return false;

    const occurrences = expandRecurringOccurrencesInRange(
      {
        dayOfWeek: slot.dayOfWeek,
        startMin: slot.startMin,
        endMin: slot.endMin,
        timezone: slot.timezone,
        recurrence: slot.recurrence ?? undefined,
        startsOn: dateOnly(slot.startsOn, slot.timezone),
        endsOn: dateOnly(slot.endsOn, slot.timezone),
      },
      rangeStart,
      rangeEnd,
    );

    return occurrences.some((occurrence) => {
      if (skippedStartsAtIso?.has(occurrence.startsAtIso)) return false;
      return new Date(occurrence.startsAtIso).getTime() === requestedStartMs;
    });
  });
}
