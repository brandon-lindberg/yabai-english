import { describe, expect, test } from "vitest";
import {
  deriveMissingOfferingsFromSchedule,
  type ScheduleClassTypeKey,
  type ExistingOfferingSnapshot,
} from "@/lib/schedule-offering-sync";

const k = (id: string, code: string): ScheduleClassTypeKey => ({
  classTypeId: id,
  classTypeCode: code,
});

describe("deriveMissingOfferingsFromSchedule", () => {
  test("returns empty list when every scheduled type has an active offering", () => {
    const existing: ExistingOfferingSnapshot[] = [
      { classTypeId: "ty-conv", active: true },
      { classTypeId: "ty-gram", active: true },
    ];

    expect(
      deriveMissingOfferingsFromSchedule({
        existing,
        scheduled: [k("ty-conv", "conversation"), k("ty-gram", "grammar")],
        fallbackRateYen: 3000,
      }),
    ).toEqual([]);
  });

  test("creates a default 30-min conversation offering when only schedule has it", () => {
    const result = deriveMissingOfferingsFromSchedule({
      existing: [],
      scheduled: [k("ty-conv", "conversation")],
      fallbackRateYen: 3500,
    });

    expect(result).toEqual([
      {
        durationMin: 30,
        rateYen: 3500,
        isGroup: false,
        groupSize: null,
        classTypeId: "ty-conv",
        active: true,
      },
    ]);
  });

  test("uses 40-min default for pronunciation so it matches a catalog product", () => {
    const result = deriveMissingOfferingsFromSchedule({
      existing: [],
      scheduled: [k("ty-pron", "pronunciation")],
      fallbackRateYen: 4000,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      durationMin: 40,
      classTypeId: "ty-pron",
      rateYen: 4000,
    });
  });

  test("skips types when an inactive offering already exists for that type (does not duplicate)", () => {
    const existing: ExistingOfferingSnapshot[] = [
      { classTypeId: "ty-gram", active: false },
    ];
    const result = deriveMissingOfferingsFromSchedule({
      existing,
      scheduled: [k("ty-gram", "grammar")],
      fallbackRateYen: 3000,
    });

    // existing covers it (regardless of active flag — we only care about coverage by id)
    expect(result).toEqual([]);
  });

  test("dedupes repeated scheduled types and creates each missing type exactly once", () => {
    const result = deriveMissingOfferingsFromSchedule({
      existing: [],
      scheduled: [
        k("ty-conv", "conversation"),
        k("ty-conv", "conversation"),
        k("ty-gram", "grammar"),
      ],
      fallbackRateYen: 3000,
    });

    expect(result.map((r) => r.classTypeId).sort()).toEqual([
      "ty-conv",
      "ty-gram",
    ]);
  });

  test("defaults rateYen to 3000 when no fallback and no existing offerings", () => {
    const result = deriveMissingOfferingsFromSchedule({
      existing: [],
      scheduled: [k("ty-conv", "conversation")],
      fallbackRateYen: null,
    });

    expect(result[0]?.rateYen).toBe(3000);
  });

  test("inherits rate from first existing individual offering when fallback is null", () => {
    const result = deriveMissingOfferingsFromSchedule({
      existing: [
        {
          classTypeId: "ty-conv",
          active: true,
          rateYen: 4200,
          isGroup: false,
        },
      ],
      scheduled: [k("ty-conv", "conversation"), k("ty-gram", "grammar")],
      fallbackRateYen: null,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      classTypeId: "ty-gram",
      rateYen: 4200,
    });
  });
});
