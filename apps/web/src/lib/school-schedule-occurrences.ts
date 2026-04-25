import {
  expandWeeklyOccurrencesInRange,
  type OccurrenceInRange,
} from "@/lib/recurring-slot-occurrences";
import type { SlotOption } from "@/lib/slot-calendar";

/**
 * Minimal taxonomy shape used for label rendering.
 *
 * `null` is allowed because slots may pre-date the taxonomy migration or be
 * created without a class-level/type assignment.
 */
export type SchoolSlotTaxonomyEntry = {
  label: string;
  labelJa?: string | null;
  labelEn?: string | null;
} | null;

/**
 * Minimal slot shape needed for occurrence expansion + label rendering.
 *
 * Keeps the helper independent of Prisma types so it can be used in client
 * components and unit-tested without a DB.
 */
export type SchoolSlotForOccurrences = {
  id: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  timezone: string;
  capacity: number;
  /** Denormalized fallback when taxonomy FKs are not set. */
  lessonLevel?: string | null;
  lessonType?: string | null;
  classLevel?: SchoolSlotTaxonomyEntry;
  classType?: SchoolSlotTaxonomyEntry;
  /** UTC ISO timestamps of cancelled occurrences. */
  skips?: string[];
};

export type CapacityInfo = { enrolled: number; capacity: number };

export type SchoolOccurrenceLabelInput = SchoolSlotForOccurrences;

export type ExpandSchoolSlotOccurrencesInput = {
  slots: SchoolSlotForOccurrences[];
  rangeStart: Date;
  rangeEnd: Date;
  /** Active enrollment count per slot id. Missing entries treated as 0. */
  enrollmentBySlotId: Record<string, number>;
  formatLabel: (
    slot: SchoolSlotForOccurrences,
    occ: { enrolled: number; capacity: number; startsAtIso: string; endsAtIso: string },
  ) => string;
};

/**
 * Pick the best locale-specific label, falling back to the canonical `label`.
 *
 * `ja` prefers `labelJa` then `label`; everything else (treated as English)
 * prefers `labelEn` then `label`.
 */
function localized(entry: SchoolSlotTaxonomyEntry, locale: string): string | null {
  if (!entry) return null;
  const isJa = locale.toLowerCase().startsWith("ja");
  if (isJa) return entry.labelJa ?? entry.label;
  return entry.labelEn ?? entry.label;
}

/**
 * Expand active school slots into `SlotOption[]` calendar entries.
 *
 * - Honors per-slot `skips` (UTC ISO of cancelled occurrences).
 * - Reuses the shared `expandWeeklyOccurrencesInRange` time-math helper so
 *   teacher availability and school schedules stay in sync on weekly recurrence.
 * - The caller supplies `formatLabel` so callers can localize independently.
 */
export function expandSchoolSlotOccurrences(
  input: ExpandSchoolSlotOccurrencesInput,
): SlotOption[] {
  const out: SlotOption[] = [];
  for (const slot of input.slots) {
    const skipSet = new Set(slot.skips ?? []);
    const occurrences: OccurrenceInRange[] = expandWeeklyOccurrencesInRange(
      slot,
      input.rangeStart,
      input.rangeEnd,
    );
    const enrolled = input.enrollmentBySlotId[slot.id] ?? 0;
    for (const occ of occurrences) {
      if (skipSet.has(occ.startsAtIso)) continue;
      out.push({
        startsAtIso: occ.startsAtIso,
        endsAtIso: occ.endsAtIso,
        groupKey: slot.id,
        label: input.formatLabel(slot, {
          enrolled,
          capacity: slot.capacity,
          startsAtIso: occ.startsAtIso,
          endsAtIso: occ.endsAtIso,
        }),
        kind: "available",
      });
    }
  }
  return out;
}

/**
 * Default label renderer: `<level> · <type> (enrolled/capacity)`.
 *
 * Prefers `classLevel`/`classType` taxonomy entries (locale-aware), falling
 * back to denormalized `lessonLevel`/`lessonType` strings.
 */
export function formatSchoolSlotLabel(
  slot: SchoolSlotForOccurrences,
  cap: CapacityInfo,
  locale: string,
): string {
  const lvl = localized(slot.classLevel ?? null, locale) ?? slot.lessonLevel ?? "";
  const type = localized(slot.classType ?? null, locale) ?? slot.lessonType ?? "";
  const taxonomy = [lvl, type].filter((s) => s.length > 0).join(" · ");
  const cap_ = `${cap.enrolled}/${cap.capacity}`;
  return taxonomy ? `${taxonomy} (${cap_})` : cap_;
}
