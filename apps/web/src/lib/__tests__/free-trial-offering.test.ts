import { describe, expect, test } from "vitest";
import {
  deriveFreeTrialOffering,
  FREE_TRIAL_DURATION_MIN,
  isFreeTrialSlotPublishable,
  teacherHasBookableFreeTrial,
} from "@/lib/free-trial-offering";

const taxonomy = { classLevelId: "level-1", classTypeId: "type-conversation" };

describe("deriveFreeTrialOffering", () => {
  test("gives a trial-offering teacher something to attach trial slots to", () => {
    const offering = deriveFreeTrialOffering({
      existing: [],
      offersFreeTrial: true,
      ...taxonomy,
    });

    expect(offering).toEqual({
      durationMin: FREE_TRIAL_DURATION_MIN,
      rateYen: 0,
      isGroup: false,
      groupSize: null,
      isFreeTrial: true,
      active: true,
      ...taxonomy,
    });
    expect(FREE_TRIAL_DURATION_MIN).toBe(20);
  });

  test("creates nothing when the teacher does not offer trials", () => {
    expect(
      deriveFreeTrialOffering({ existing: [], offersFreeTrial: false, ...taxonomy }),
    ).toBeNull();
  });

  test("does not create a second trial offering", () => {
    expect(
      deriveFreeTrialOffering({
        existing: [{ isFreeTrial: true, active: true }],
        offersFreeTrial: true,
        ...taxonomy,
      }),
    ).toBeNull();
  });

  test("is unmoved by the teacher's priced offerings", () => {
    const offering = deriveFreeTrialOffering({
      existing: [{ isFreeTrial: false, active: true }],
      offersFreeTrial: true,
      ...taxonomy,
    });

    expect(offering).not.toBeNull();
    expect(offering?.rateYen).toBe(0);
  });

  test("needs a taxonomy to hang the offering on", () => {
    expect(
      deriveFreeTrialOffering({
        existing: [],
        offersFreeTrial: true,
        classLevelId: null,
        classTypeId: null,
      }),
    ).toBeNull();
  });
});

describe("isFreeTrialSlotPublishable", () => {
  test("accepts a 20 minute slot from a teacher who offers trials", () => {
    expect(
      isFreeTrialSlotPublishable({ durationMin: 20, offersFreeTrial: true }),
    ).toBe(true);
  });

  test("refuses trial slots once the teacher turns trials off", () => {
    expect(
      isFreeTrialSlotPublishable({ durationMin: 20, offersFreeTrial: false }),
    ).toBe(false);
  });

  // The booking match requires slot duration to equal lesson duration exactly,
  // so a trial slot of any other length can never be booked.
  test("refuses a trial slot that is not the trial length", () => {
    expect(
      isFreeTrialSlotPublishable({ durationMin: 30, offersFreeTrial: true }),
    ).toBe(false);
  });
});

describe("teacherHasBookableFreeTrial", () => {
  const trialSlot = { teacherLessonOffering: { isFreeTrial: true } };
  const paidSlot = { teacherLessonOffering: { isFreeTrial: false } };

  test("is true when trials are on and a trial slot is published", () => {
    expect(
      teacherHasBookableFreeTrial({ offersFreeTrial: true, availabilitySlots: [paidSlot, trialSlot] }),
    ).toBe(true);
  });

  // The badge is a promise to the student. A teacher with trials switched on but
  // no trial hours published cannot actually be booked for one, so saying so
  // would send them to a profile where no trial is available.
  test("is false when no trial hours are published", () => {
    expect(
      teacherHasBookableFreeTrial({ offersFreeTrial: true, availabilitySlots: [paidSlot] }),
    ).toBe(false);
  });

  test("is false once the teacher turns trials off, even with slots still on the books", () => {
    expect(
      teacherHasBookableFreeTrial({ offersFreeTrial: false, availabilitySlots: [trialSlot] }),
    ).toBe(false);
  });

  test("is false for a teacher with no availability at all", () => {
    expect(teacherHasBookableFreeTrial({ offersFreeTrial: true, availabilitySlots: [] })).toBe(false);
  });

  test("tolerates a slot with no offering attached", () => {
    expect(
      teacherHasBookableFreeTrial({
        offersFreeTrial: true,
        availabilitySlots: [{ teacherLessonOffering: null }],
      }),
    ).toBe(false);
  });
});
