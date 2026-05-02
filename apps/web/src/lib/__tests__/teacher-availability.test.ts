import { describe, expect, test } from "vitest";
import { teacherAvailabilitySchema } from "@/lib/teacher-availability";

const baseSlot = {
  timezone: "Asia/Tokyo",
  classLevelId: "lvl-int",
  classTypeId: "ty-conv",
};

describe("teacherAvailabilitySchema", () => {
  test("rejects end time at or before start on the same day (e.g. noon to midnight)", () => {
    expect(
      teacherAvailabilitySchema.safeParse([
        { dayOfWeek: 1, startMin: 10 * 60, endMin: 0, ...baseSlot },
      ]).success,
    ).toBe(false);
    expect(
      teacherAvailabilitySchema.safeParse([
        { dayOfWeek: 1, startMin: 10 * 60, endMin: 10 * 60, ...baseSlot },
      ]).success,
    ).toBe(false);
  });

  test("accepts end after start on the same calendar day", () => {
    expect(
      teacherAvailabilitySchema.safeParse([
        { dayOfWeek: 1, startMin: 10 * 60, endMin: 12 * 60, ...baseSlot },
      ]).success,
    ).toBe(true);
  });

  test("requires classLevelId and classTypeId to be present", () => {
    expect(
      teacherAvailabilitySchema.safeParse([
        {
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          timezone: "Asia/Tokyo",
          classLevelId: "",
          classTypeId: "ty-conv",
        },
      ]).success,
    ).toBe(false);
    expect(
      teacherAvailabilitySchema.safeParse([
        {
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          timezone: "Asia/Tokyo",
          classLevelId: "lvl-int",
          classTypeId: "",
        },
      ]).success,
    ).toBe(false);
  });

  test("accepts a slot with both FK ids set", () => {
    expect(
      teacherAvailabilitySchema.safeParse([
        {
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          timezone: "Asia/Tokyo",
          classLevelId: "lvl-adv",
          classTypeId: "ty-biz",
        },
      ]).success,
    ).toBe(true);
  });
});
