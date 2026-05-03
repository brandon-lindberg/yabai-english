/**
 * Keeps a teacher's bookable `TeacherLessonOffering` rows in sync with the
 * class types they've added to their availability schedule.
 *
 * Why: the student booking dropdown is populated from lesson offerings, but
 * teachers set class types per availability slot. Without a sync step, a
 * teacher who schedules varied types still only sees whatever single default
 * offering they started with.
 *
 * This module only ADDS missing offerings. It never edits or removes
 * offerings the teacher has configured explicitly — rate/duration changes
 * remain under the teacher's control in the profile rates editor.
 */

export type ScheduleClassTypeKey = {
  /** TeacherClassLevel.id */
  classLevelId: string;
  /** TeacherClassType.id */
  classTypeId: string;
  /** TeacherClassType.code (used to derive sensible default duration) */
  classTypeCode: string;
};

export type ExistingOfferingSnapshot = {
  classLevelId?: string | null;
  classTypeId: string | null;
  active: boolean;
  rateYen?: number;
  isGroup?: boolean;
};

export type DerivedOfferingToCreate = {
  durationMin: number;
  rateYen: number;
  isGroup: false;
  groupSize: null;
  classTypeId: string;
  classLevelId: string;
  active: true;
};

type DeriveInput = {
  existing: ExistingOfferingSnapshot[];
  scheduled: ScheduleClassTypeKey[];
  fallbackRateYen: number | null;
};

const DEFAULT_DURATION_BY_CODE: Record<string, number> = {
  pronunciation: 40,
  conversation: 30,
  grammar: 30,
  reading: 30,
  writing: 30,
  business: 30,
};

const SAFETY_NET_RATE_YEN = 3000;

function resolveDefaultDuration(code: string): number {
  return DEFAULT_DURATION_BY_CODE[code] ?? 30;
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
  const coveredIds = new Set<string>();
  for (const o of existing) {
    if (!o.classTypeId) continue;
    coveredIds.add(o.classTypeId);
  }

  const rate = resolveRate(fallbackRateYen, existing);
  const seen = new Set<string>();
  const result: DerivedOfferingToCreate[] = [];

  for (const slot of scheduled) {
    if (coveredIds.has(slot.classTypeId) || seen.has(slot.classTypeId)) continue;
    seen.add(slot.classTypeId);
    result.push({
      durationMin: resolveDefaultDuration(slot.classTypeCode),
      rateYen: rate,
      isGroup: false,
      groupSize: null,
      classTypeId: slot.classTypeId,
      classLevelId: slot.classLevelId,
      active: true,
    });
  }

  return result;
}
