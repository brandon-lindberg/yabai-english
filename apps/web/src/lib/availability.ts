import { DateTime } from "luxon";
import { expandWeeklyOccurrencesInRange } from "@/lib/recurring-slot-occurrences";

type AvailabilitySlotInput = {
  id: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  timezone: string;
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
  /** UTC startsAtIso values to omit (single-occurrence removals). */
  skippedStartsAtIso?: ReadonlySet<string>;
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
  horizonDays = 21,
  minimumLeadHours = 0,
  allowPastInstances = false,
  skippedStartsAtIso,
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
    const zoneRangeEnd = zoneRangeStart
      .plus({ days: Math.max(0, horizonDays - 1) })
      .endOf("day");

    const occurrences = expandWeeklyOccurrencesInRange(
      {
        dayOfWeek: slot.dayOfWeek,
        startMin: slot.startMin,
        endMin: slot.endMin,
        timezone: slot.timezone,
      },
      zoneRangeStart.toJSDate(),
      zoneRangeEnd.toJSDate(),
    );

    for (const occ of occurrences) {
      const startsAtIso = occ.startsAtIso;
      if (skippedStartsAtIso?.has(startsAtIso)) continue;

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
