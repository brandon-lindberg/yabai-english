import { describe, expect, test } from "vitest";
import { schoolScheduleSlotInputSchema } from "@/lib/school-schedule-slot";

describe("schoolScheduleSlotInputSchema", () => {
  const valid = {
    dayOfWeek: 1,
    startMin: 540,
    endMin: 600,
    durationMin: 60,
    capacity: 5,
  };

  test("accepts a valid slot", () => {
    expect(schoolScheduleSlotInputSchema.safeParse(valid).success).toBe(true);
  });

  test("rejects dayOfWeek out of [0,6]", () => {
    expect(
      schoolScheduleSlotInputSchema.safeParse({ ...valid, dayOfWeek: -1 }).success,
    ).toBe(false);
    expect(
      schoolScheduleSlotInputSchema.safeParse({ ...valid, dayOfWeek: 7 }).success,
    ).toBe(false);
  });

  test("rejects startMin >= endMin", () => {
    expect(
      schoolScheduleSlotInputSchema.safeParse({
        ...valid,
        startMin: 600,
        endMin: 540,
      }).success,
    ).toBe(false);
    expect(
      schoolScheduleSlotInputSchema.safeParse({
        ...valid,
        startMin: 600,
        endMin: 600,
      }).success,
    ).toBe(false);
  });

  test("rejects negative startMin", () => {
    expect(
      schoolScheduleSlotInputSchema.safeParse({ ...valid, startMin: -10 }).success,
    ).toBe(false);
  });

  test("rejects endMin > 1440", () => {
    expect(
      schoolScheduleSlotInputSchema.safeParse({ ...valid, endMin: 1500 }).success,
    ).toBe(false);
  });

  test("rejects durationMin < 1", () => {
    expect(
      schoolScheduleSlotInputSchema.safeParse({ ...valid, durationMin: 0 }).success,
    ).toBe(false);
  });

  test("rejects capacity < 1", () => {
    expect(
      schoolScheduleSlotInputSchema.safeParse({ ...valid, capacity: 0 }).success,
    ).toBe(false);
  });

  test("accepts optional taxonomy ids when provided", () => {
    const result = schoolScheduleSlotInputSchema.safeParse({
      ...valid,
      classLevelId: "lvl-1",
      classTypeId: "typ-1",
    });
    expect(result.success).toBe(true);
  });
});
