import {
  EMPTY_OCCURRENCE_SKIPS,
  isOccurrenceSkipped,
  type OccurrenceSkipIndex,
} from "@/lib/availability-occurrence-skips";
import { DateTime } from "luxon";
import {
  expandRecurringOccurrencesInRange,
  type RecurrencePattern,
} from "@/lib/recurring-slot-occurrences";
import { availabilityWindowEndDayKey } from "@/lib/availability-window";

const DEFAULT_AVAILABILITY_HORIZON_DAYS = 365;

type AvailabilitySlotInput = {
  id: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  timezone: string;
  recurrence?: RecurrencePattern | null;
  startsOn?: string | null;
  endsOn?: string | null;
  /** FK to TeacherClassLevel.id (nullable while migration completes). */
  classLevelId: string | null;
  /** FK to TeacherClassType.id (nullable while migration completes). */
  classTypeId: string | null;
};

type BuildOptions = {
  availabilitySlots: AvailabilitySlotInput[];
  viewerTimezone: string;
  now?: string | Date;
  horizonDays?: number;
  minimumLeadHours?: number;
  /** When true, include instances that start in the past (for teacher availability editor). */
  allowPastInstances?: boolean;
  /** Occurrences the teacher has cancelled, by rule and instant. */
  skippedOccurrences?: OccurrenceSkipIndex;
  /** Appends " · {result}" after the time range when provided. */
  formatLessonMeta?: (slot: AvailabilitySlotInput) => string;
};

export type SlotOption = {
  slotId: string;
  startsAtIso: string;
  endsAtIso: string;
  label: string;
  classTypeId: string | null;
};

export function buildUpcomingSlotOptions({
  availabilitySlots,
  viewerTimezone,
  now = new Date(),
  horizonDays = DEFAULT_AVAILABILITY_HORIZON_DAYS,
  minimumLeadHours = 0,
  allowPastInstances = false,
  skippedOccurrences = EMPTY_OCCURRENCE_SKIPS,
  formatLessonMeta,
}: BuildOptions): SlotOption[] {
  const nowUtc =
    typeof now === "string"
      ? DateTime.fromISO(now, { zone: "utc" })
      : DateTime.fromJSDate(now, { zone: "utc" });
  const options: SlotOption[] = [];
  const leadMs = minimumLeadHours * 60 * 60 * 1000;

  for (const slot of availabilitySlots) {
    const zoneNow = nowUtc.setZone(slot.timezone);
    const zoneRangeStart = zoneNow.startOf("day");
    const horizonEnd = zoneRangeStart
      .plus({ days: Math.max(0, horizonDays - 1) })
      .endOf("day");
    // The publishing window is a ceiling no caller can raise: an open-ended
    // weekly slot would otherwise repeat for as long as the horizon allows, and
    // a teacher who stops using the app would keep taking bookings for it.
    const windowEnd = DateTime.fromISO(
      availabilityWindowEndDayKey(nowUtc.toJSDate(), slot.timezone),
      { zone: slot.timezone },
    ).endOf("day");
    const zoneRangeEnd = horizonEnd < windowEnd ? horizonEnd : windowEnd;

    const occurrences = expandRecurringOccurrencesInRange(
      {
        dayOfWeek: slot.dayOfWeek,
        startMin: slot.startMin,
        endMin: slot.endMin,
        timezone: slot.timezone,
        recurrence: slot.recurrence ?? undefined,
        startsOn: slot.startsOn ?? undefined,
        endsOn: slot.endsOn ?? undefined,
      },
      zoneRangeStart.toJSDate(),
      zoneRangeEnd.toJSDate(),
    );

    for (const occ of occurrences) {
      const startsAtIso = occ.startsAtIso;
      if (isOccurrenceSkipped(skippedOccurrences, slot.id, startsAtIso)) continue;

      const startUtc = DateTime.fromISO(startsAtIso, { zone: "utc" });
      if (!allowPastInstances && startUtc <= nowUtc.plus({ milliseconds: leadMs })) continue;

      const endUtc = DateTime.fromISO(occ.endsAtIso, { zone: "utc" });
      const startViewer = startUtc.setZone(viewerTimezone);
      const endViewer = endUtc.setZone(viewerTimezone);
      const timeLabel = `${startViewer.toFormat("ccc, LLL d HH:mm")} - ${endViewer.toFormat(
        "HH:mm",
      )} (${viewerTimezone})`;
      const meta = formatLessonMeta?.(slot);
      const label = meta ? `${timeLabel} · ${meta}` : timeLabel;

      options.push({
        slotId: slot.id,
        startsAtIso,
        endsAtIso: occ.endsAtIso,
        label,
        classTypeId: slot.classTypeId,
      });
    }
  }

  return options.sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));
}
