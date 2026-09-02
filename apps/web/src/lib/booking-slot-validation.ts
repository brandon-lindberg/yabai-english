import {
  buildOccurrenceSkipIndex,
  type OccurrenceSkip,
} from "@/lib/availability-occurrence-skips";
import { buildUpcomingSlotOptions } from "@/lib/availability";
import type { RecurrencePattern } from "@/lib/recurring-slot-occurrences";

export type TeacherAvailabilitySlotInput = {
  id: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  timezone: string;
  recurrence?: RecurrencePattern | null;
  startsOn?: string | null;
  endsOn?: string | null;
  classLevelId: string | null;
  classTypeId: string | null;
};

export function validateBookingAgainstTeacherAvailability({
  startsAtIso,
  durationMin,
  availabilitySlots,
  occurrenceSkips = [],
  viewerTimezone,
  minimumLeadHours = 48,
  now = new Date(),
}: {
  startsAtIso: string;
  durationMin: number;
  availabilitySlots: TeacherAvailabilitySlotInput[];
  occurrenceSkips?: readonly OccurrenceSkip[];
  viewerTimezone: string;
  minimumLeadHours?: number;
  now?: Date | string;
}):
  | { ok: true; slotId: string; classTypeId: string | null }
  | { ok: false; error: string } {
  const skippedOccurrences = buildOccurrenceSkipIndex(occurrenceSkips);
  const options = buildUpcomingSlotOptions({
    availabilitySlots,
    viewerTimezone,
    minimumLeadHours,
    skippedOccurrences,
    now,
  });

  const match = options.find((option) => option.startsAtIso === startsAtIso);
  if (!match) {
    return { ok: false, error: "The selected time is not available." };
  }

  const slotDurationMin = Math.round(
    (new Date(match.endsAtIso).getTime() - new Date(match.startsAtIso).getTime()) / 60_000,
  );
  if (durationMin > slotDurationMin) {
    return {
      ok: false,
      error: "The lesson duration does not fit in the selected time slot.",
    };
  }

  return { ok: true, slotId: match.slotId, classTypeId: match.classTypeId };
}
