import { DateTime } from "luxon";

type AvailabilitySlotInput = {
  id: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  timezone: string;
  lessonLevel: string;
  lessonType: string;
  lessonTypeCustom?: string | null;
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
};

function jsDayOfWeek(dt: DateTime) {
  return dt.weekday % 7;
}

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

  for (const slot of availabilitySlots) {
    const zoneNow = nowUtc.setZone(slot.timezone);
    for (let offset = 0; offset < horizonDays; offset += 1) {
      const day = zoneNow.startOf("day").plus({ days: offset });
      if (jsDayOfWeek(day) !== slot.dayOfWeek) continue;

      const startHour = Math.floor(slot.startMin / 60);
      const startMinute = slot.startMin % 60;
      const endHour = Math.floor(slot.endMin / 60);
      const endMinute = slot.endMin % 60;

      const startTeacher = day.set({
        hour: startHour,
        minute: startMinute,
        second: 0,
        millisecond: 0,
      });
      const endTeacher = day.set({
        hour: endHour,
        minute: endMinute,
        second: 0,
        millisecond: 0,
      });

      const startUtc = startTeacher.toUTC();
      const endUtc = endTeacher.toUTC();
      const startsAtIso = startUtc.toISO({ suppressMilliseconds: false }) ?? "";
      if (skippedStartsAtIso?.has(startsAtIso)) continue;

      const leadMs = minimumLeadHours * 60 * 60 * 1000;
      if (!allowPastInstances && startUtc <= nowUtc.plus({ milliseconds: leadMs })) continue;

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
        endsAtIso: endUtc.toISO({ suppressMilliseconds: false }) ?? "",
        label,
      });
    }
  }

  return options.sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));
}
