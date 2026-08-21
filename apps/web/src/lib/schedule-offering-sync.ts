import { MIN_PUBLIC_LESSON_RATE_YEN } from "@/lib/lesson-rate-policy";
import { isTeacherEditableOffering } from "@/lib/teacher-offering-permissions";

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
  isFreeTrial?: boolean | null;
  adminRateOverrideByUserId?: string | null;
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


function resolveDefaultDuration(code: string): number {
  return DEFAULT_DURATION_BY_CODE[code] ?? 30;
}

function resolveRate(
  fallbackRateYen: number | null,
  existing: ExistingOfferingSnapshot[],
): number {
  // Only classes the teacher priced themselves are a fair guide. The free trial
  // is fixed at 0, and an admin-granted rate is a concession for one specific
  // class — copying either onto a new class would set a price nobody chose.
  const teacherPriced = existing.filter(isTeacherEditableOffering);

  const candidates = [
    fallbackRateYen,
    teacherPriced.find((o) => o.isGroup === false && typeof o.rateYen === "number" && o.rateYen > 0)
      ?.rateYen,
    teacherPriced.find((o) => typeof o.rateYen === "number" && o.rateYen > 0)?.rateYen,
  ];

  const inferred = candidates.find(
    (rate): rate is number => typeof rate === "number" && rate > 0,
  );

  // Derived classes are public, so they are held to the public minimum like any
  // other — a low fallback must not create a class nobody could have saved.
  return Math.max(inferred ?? MIN_PUBLIC_LESSON_RATE_YEN, MIN_PUBLIC_LESSON_RATE_YEN);
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
