/**
 * Keeps a teacher's bookable `TeacherLessonOffering` rows in sync with the
 * lesson types they've added to their availability schedule.
 *
 * Why: the student booking dropdown is populated from lesson offerings, but
 * teachers set lesson types per availability slot. Without a sync step, a
 * teacher who schedules varied types (grammar, pronunciation, ...) still
 * only sees whatever single default offering they started with.
 *
 * This module only ADDS missing offerings. It never edits or removes
 * offerings the teacher has configured explicitly — rate/duration changes
 * remain under the teacher's control in the profile rates editor.
 */

export type ScheduleLessonTypeKey = {
  lessonType: string;
  lessonTypeCustom: string | null;
};

export type ExistingOfferingSnapshot = {
  lessonType: string | null;
  lessonTypeCustom: string | null;
  active: boolean;
  rateYen?: number;
  isGroup?: boolean;
};

export type DerivedOfferingToCreate = {
  durationMin: number;
  rateYen: number;
  isGroup: false;
  groupSize: null;
  lessonType: string;
  lessonTypeCustom: string | null;
  active: true;
};

type DeriveInput = {
  existing: ExistingOfferingSnapshot[];
  scheduled: ScheduleLessonTypeKey[];
  fallbackRateYen: number | null;
};

const DEFAULT_DURATION_BY_TYPE: Record<string, number> = {
  pronunciation: 40,
  conversation: 30,
  grammar: 30,
  reading: 30,
  writing: 30,
  business: 30,
  custom: 30,
};

const SAFETY_NET_RATE_YEN = 3000;

function keyFor(lessonType: string, lessonTypeCustom: string | null): string {
  if (lessonType === "custom") {
    return `custom::${(lessonTypeCustom ?? "").trim().toLowerCase()}`;
  }
  return lessonType;
}

function resolveDefaultDuration(lessonType: string): number {
  return DEFAULT_DURATION_BY_TYPE[lessonType] ?? 30;
}

function resolveRate(
  fallbackRateYen: number | null,
  existing: ExistingOfferingSnapshot[],
): number {
  if (typeof fallbackRateYen === "number" && fallbackRateYen > 0) {
    return fallbackRateYen;
  }
  const firstIndividual = existing.find(
    (o) => o.isGroup === false && typeof o.rateYen === "number" && o.rateYen > 0,
  );
  if (firstIndividual?.rateYen) return firstIndividual.rateYen;
  const firstAny = existing.find(
    (o) => typeof o.rateYen === "number" && o.rateYen > 0,
  );
  if (firstAny?.rateYen) return firstAny.rateYen;
  return SAFETY_NET_RATE_YEN;
}

export function deriveMissingOfferingsFromSchedule({
  existing,
  scheduled,
  fallbackRateYen,
}: DeriveInput): DerivedOfferingToCreate[] {
  const coveredKeys = new Set<string>();
  for (const o of existing) {
    if (!o.lessonType) continue;
    coveredKeys.add(keyFor(o.lessonType, o.lessonTypeCustom));
  }

  const rate = resolveRate(fallbackRateYen, existing);
  const seen = new Set<string>();
  const result: DerivedOfferingToCreate[] = [];

  for (const slot of scheduled) {
    const key = keyFor(slot.lessonType, slot.lessonTypeCustom);
    if (coveredKeys.has(key) || seen.has(key)) continue;
    if (slot.lessonType === "custom" && !(slot.lessonTypeCustom ?? "").trim()) {
      continue;
    }
    seen.add(key);
    result.push({
      durationMin: resolveDefaultDuration(slot.lessonType),
      rateYen: rate,
      isGroup: false,
      groupSize: null,
      lessonType: slot.lessonType,
      lessonTypeCustom: slot.lessonType === "custom"
        ? (slot.lessonTypeCustom?.trim() ?? null)
        : null,
      active: true,
    });
  }

  return result;
}
