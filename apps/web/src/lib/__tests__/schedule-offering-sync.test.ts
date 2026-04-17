import { describe, expect, test } from "vitest";
import {
  deriveMissingOfferingsFromSchedule,
  type ScheduleLessonTypeKey,
  type ExistingOfferingSnapshot,
} from "@/lib/schedule-offering-sync";

describe("deriveMissingOfferingsFromSchedule", () => {
  test("returns empty list when every scheduled type has an active offering", () => {
    const existing: ExistingOfferingSnapshot[] = [
      { lessonType: "conversation", lessonTypeCustom: null, active: true },
      { lessonType: "grammar", lessonTypeCustom: null, active: true },
    ];
    const scheduled: ScheduleLessonTypeKey[] = [
      { lessonType: "conversation", lessonTypeCustom: null },
      { lessonType: "grammar", lessonTypeCustom: null },
    ];

    expect(
      deriveMissingOfferingsFromSchedule({
        existing,
        scheduled,
        fallbackRateYen: 3000,
      }),
    ).toEqual([]);
  });

  test("creates a default 30-min conversation offering when only schedule has it", () => {
    const result = deriveMissingOfferingsFromSchedule({
      existing: [],
      scheduled: [{ lessonType: "conversation", lessonTypeCustom: null }],
      fallbackRateYen: 3500,
    });

    expect(result).toEqual([
      {
        durationMin: 30,
        rateYen: 3500,
        isGroup: false,
        groupSize: null,
        lessonType: "conversation",
        lessonTypeCustom: null,
        active: true,
      },
    ]);
  });

  test("uses 40-min default for pronunciation so it matches a catalog product", () => {
    const result = deriveMissingOfferingsFromSchedule({
      existing: [],
      scheduled: [{ lessonType: "pronunciation", lessonTypeCustom: null }],
      fallbackRateYen: 4000,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      durationMin: 40,
      lessonType: "pronunciation",
      rateYen: 4000,
    });
  });

  test("skips types when an inactive offering already exists for that type (does not duplicate)", () => {
    const existing: ExistingOfferingSnapshot[] = [
      { lessonType: "grammar", lessonTypeCustom: null, active: false },
    ];
    const result = deriveMissingOfferingsFromSchedule({
      existing,
      scheduled: [{ lessonType: "grammar", lessonTypeCustom: null }],
      fallbackRateYen: 3000,
    });

    expect(result).toEqual([]);
  });

  test("dedupes repeated scheduled types and creates each missing type exactly once", () => {
    const result = deriveMissingOfferingsFromSchedule({
      existing: [],
      scheduled: [
        { lessonType: "conversation", lessonTypeCustom: null },
        { lessonType: "conversation", lessonTypeCustom: null },
        { lessonType: "grammar", lessonTypeCustom: null },
      ],
      fallbackRateYen: 3000,
    });

    expect(result.map((r) => r.lessonType).sort()).toEqual([
      "conversation",
      "grammar",
    ]);
  });

  test("treats custom lesson types as distinct per lessonTypeCustom label", () => {
    const existing: ExistingOfferingSnapshot[] = [
      { lessonType: "custom", lessonTypeCustom: "Interview prep", active: true },
    ];
    const result = deriveMissingOfferingsFromSchedule({
      existing,
      scheduled: [
        { lessonType: "custom", lessonTypeCustom: "Interview prep" },
        { lessonType: "custom", lessonTypeCustom: "Kids storytime" },
      ],
      fallbackRateYen: 3000,
    });

    expect(result).toEqual([
      {
        durationMin: 30,
        rateYen: 3000,
        isGroup: false,
        groupSize: null,
        lessonType: "custom",
        lessonTypeCustom: "Kids storytime",
        active: true,
      },
    ]);
  });

  test("defaults rateYen to 3000 when no fallback and no existing offerings", () => {
    const result = deriveMissingOfferingsFromSchedule({
      existing: [],
      scheduled: [{ lessonType: "conversation", lessonTypeCustom: null }],
      fallbackRateYen: null,
    });

    expect(result[0]?.rateYen).toBe(3000);
  });

  test("inherits rate from first existing individual offering when fallback is null", () => {
    const result = deriveMissingOfferingsFromSchedule({
      existing: [
        { lessonType: "conversation", lessonTypeCustom: null, active: true, rateYen: 4200 },
      ],
      scheduled: [
        { lessonType: "conversation", lessonTypeCustom: null },
        { lessonType: "grammar", lessonTypeCustom: null },
      ],
      fallbackRateYen: null,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ lessonType: "grammar", rateYen: 4200 });
  });
});
