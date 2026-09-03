import { describe, expect, test } from "vitest";
import {
  MIN_GROUP_CAPACITY,
  collectedWhenFullYen,
  groupTotalAtFloorYen,
  perStudentRateYen,
  validateGroupOfferingRate,
} from "@/lib/group-lesson-pricing";
import {
  MIN_PUBLIC_LESSON_RATE_YEN,
  validatePublicLessonRateYen,
} from "@/lib/lesson-rate-policy";

describe("perStudentRateYen", () => {
  test("divides a group total evenly across the seats", () => {
    expect(perStudentRateYen(8000, 4)).toBe(2000);
  });

  test("rounds up when the total does not divide evenly", () => {
    // 10,000 over 3 seats is 3,333.33. Flooring would leave the teacher short of
    // the total they themselves asked for once the class fills, so we round the
    // share up and show them what a full class actually collects.
    expect(perStudentRateYen(10_000, 3)).toBe(3334);
  });

  test("refuses a capacity below the group minimum", () => {
    expect(() => perStudentRateYen(8000, MIN_GROUP_CAPACITY - 1)).toThrow();
  });
});

describe("collectedWhenFullYen", () => {
  test("is the share times the seats", () => {
    expect(collectedWhenFullYen(2000, 4)).toBe(8000);
  });

  test("exceeds the stated total when the split is uneven", () => {
    // The teacher asked for 10,000; rounding the share up collects 10,002. The
    // form shows both figures so the extra two yen is never a surprise.
    expect(collectedWhenFullYen(perStudentRateYen(10_000, 3), 3)).toBe(10_002);
  });
});

describe("groupTotalAtFloorYen", () => {
  test("is the total at which every seat pays exactly the public floor", () => {
    expect(groupTotalAtFloorYen(5)).toBe(5 * MIN_PUBLIC_LESSON_RATE_YEN);
  });

  test("is a total the validator accepts", () => {
    const capacity = 5;
    expect(
      validateGroupOfferingRate({ groupTotalYen: groupTotalAtFloorYen(capacity), capacity }),
    ).toMatchObject({ ok: true, perStudentYen: MIN_PUBLIC_LESSON_RATE_YEN });
  });
});

describe("validateGroupOfferingRate", () => {
  test("accepts a total whose share clears the public floor", () => {
    expect(validateGroupOfferingRate({ groupTotalYen: 16_000, capacity: 4 })).toEqual({
      ok: true,
      perStudentYen: 4000,
      collectedWhenFullYen: 16_000,
    });
  });

  test("accepts a share sitting exactly on the floor", () => {
    expect(
      validateGroupOfferingRate({ groupTotalYen: 15_000, capacity: 5 }),
    ).toMatchObject({ ok: true, perStudentYen: MIN_PUBLIC_LESSON_RATE_YEN });
  });

  test("holds the floor against the share, not the group total", () => {
    // This is the locked decision, and it is the whole reason this module
    // exists: 8,000 is a legal lesson price on its own, but 2,000 a seat is not.
    expect(validatePublicLessonRateYen(8000).ok).toBe(true);
    expect(validateGroupOfferingRate({ groupTotalYen: 8000, capacity: 4 }).ok).toBe(false);
  });

  test("hands back the share and the round total, so the form can translate its own message", () => {
    expect(validateGroupOfferingRate({ groupTotalYen: 8000, capacity: 4 })).toEqual({
      ok: false,
      reason: "BELOW_PUBLIC_MINIMUM",
      perStudentYen: 2000,
      totalAtFloorYen: 12_000,
      error: expect.any(String),
    });
  });

  test("accepts a total just under the round figure, because the share still clears", () => {
    // 11,999 over 4 seats rounds up to exactly 3,000 a seat. The rule is the
    // share, not the total, so this is legal even though it sits a yen under
    // groupTotalAtFloorYen(4). Pinned deliberately rather than left to chance.
    expect(validateGroupOfferingRate({ groupTotalYen: 11_999, capacity: 4 })).toMatchObject({
      ok: true,
      perStudentYen: MIN_PUBLIC_LESSON_RATE_YEN,
    });
  });

  test("refuses a capacity below the group minimum", () => {
    expect(validateGroupOfferingRate({ groupTotalYen: 8000, capacity: 1 }).ok).toBe(false);
  });

  test("refuses a total of zero or less", () => {
    expect(validateGroupOfferingRate({ groupTotalYen: 0, capacity: 4 }).ok).toBe(false);
    expect(validateGroupOfferingRate({ groupTotalYen: -1, capacity: 4 }).ok).toBe(false);
  });

  test("refuses a fractional total rather than silently truncating it", () => {
    expect(validateGroupOfferingRate({ groupTotalYen: 8000.5, capacity: 4 }).ok).toBe(false);
  });
});
