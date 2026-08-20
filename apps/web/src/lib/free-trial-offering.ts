/**
 * The free trial as something a teacher can actually schedule.
 *
 * A trial used to be only a global `LessonProduct`, which made it unbookable in
 * practice: every availability slot must name a `TeacherLessonOffering`, and a
 * booking only matches a slot whose duration equals the lesson's exactly. With
 * no 20-minute offering to bind to, a teacher had nowhere to put trial hours.
 *
 * So a teacher's trial is an offering like any other — priced at zero, marked
 * `isFreeTrial` — and the existing slot, matching, and booking machinery works
 * on it unchanged.
 */

export const FREE_TRIAL_DURATION_MIN = 20;

/**
 * Every teacher offers a trial unless they opt out, so the offering hangs off
 * the taxonomy every teacher is seeded with rather than whatever they happened
 * to schedule first.
 */
export const FREE_TRIAL_DEFAULT_LEVEL_CODE = "beginner";
export const FREE_TRIAL_DEFAULT_TYPE_CODE = "conversation";

export type ExistingOfferingForTrial = {
  isFreeTrial?: boolean | null;
  active: boolean;
};

export type DerivedFreeTrialOffering = {
  durationMin: typeof FREE_TRIAL_DURATION_MIN;
  rateYen: 0;
  isGroup: false;
  groupSize: null;
  isFreeTrial: true;
  active: true;
  classLevelId: string;
  classTypeId: string;
};

export function deriveFreeTrialOffering({
  existing,
  offersFreeTrial,
  classLevelId,
  classTypeId,
}: {
  existing: ExistingOfferingForTrial[];
  offersFreeTrial: boolean;
  classLevelId: string | null;
  classTypeId: string | null;
}): DerivedFreeTrialOffering | null {
  if (!offersFreeTrial) return null;
  // A slot must match its offering on level and type, so the trial needs a
  // taxonomy to hang on. Without one there is nothing valid to create.
  if (!classLevelId || !classTypeId) return null;
  if (existing.some((offering) => offering.isFreeTrial)) return null;

  return {
    durationMin: FREE_TRIAL_DURATION_MIN,
    rateYen: 0,
    isGroup: false,
    groupSize: null,
    isFreeTrial: true,
    active: true,
    classLevelId,
    classTypeId,
  };
}

/**
 * Whether a slot bound to the trial offering may be published. A trial slot of
 * any other length is unbookable, so publishing one would advertise a lesson
 * nobody can take.
 */
export function isFreeTrialSlotPublishable({
  durationMin,
  offersFreeTrial,
}: {
  durationMin: number;
  offersFreeTrial: boolean;
}): boolean {
  return offersFreeTrial && durationMin === FREE_TRIAL_DURATION_MIN;
}

/**
 * Whether a student could actually book a trial with this teacher right now.
 *
 * The switch alone is not enough: a booking only matches a slot whose duration
 * equals the lesson's, so a teacher with trials on but no trial hours published
 * cannot be booked for one. Advertising that would be a promise the schedule
 * cannot keep.
 */
export function teacherHasBookableFreeTrial({
  offersFreeTrial,
  availabilitySlots,
}: {
  offersFreeTrial: boolean;
  availabilitySlots: ReadonlyArray<{
    teacherLessonOffering?: { isFreeTrial?: boolean | null } | null;
  }>;
}): boolean {
  if (!offersFreeTrial) return false;
  return availabilitySlots.some((slot) => slot.teacherLessonOffering?.isFreeTrial === true);
}
