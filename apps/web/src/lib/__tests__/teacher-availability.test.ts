import { describe, expect, test } from "vitest";
import { teacherAvailabilitySchema } from "@/lib/teacher-availability";

const baseSlot = {
  timezone: "Asia/Tokyo",
  classLevelId: "lvl-int",
  classTypeId: "ty-conv",
  teacherLessonOfferingId: "offer-conv-40",
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

  test("requires classLevelId, classTypeId, and teacherLessonOfferingId to be present", () => {
    expect(
      teacherAvailabilitySchema.safeParse([
        {
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          timezone: "Asia/Tokyo",
          classLevelId: "",
          classTypeId: "ty-conv",
          teacherLessonOfferingId: "offer-conv-40",
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
          teacherLessonOfferingId: "offer-conv-40",
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
          classTypeId: "ty-conv",
          teacherLessonOfferingId: "",
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
          teacherLessonOfferingId: "offer-biz-60",
        },
      ]).success,
    ).toBe(true);
  });

  test("accepts one-off slots only when a startsOn date is present", () => {
    expect(
      teacherAvailabilitySchema.safeParse([
        {
          dayOfWeek: 5,
          startMin: 10 * 60,
          endMin: 11 * 60,
          recurrence: "ONE_OFF",
          startsOn: "2026-05-15",
          ...baseSlot,
        },
      ]).success,
    ).toBe(true);

    expect(
      teacherAvailabilitySchema.safeParse([
        {
          dayOfWeek: 5,
          startMin: 10 * 60,
          endMin: 11 * 60,
          recurrence: "ONE_OFF",
          ...baseSlot,
        },
      ]).success,
    ).toBe(false);
  });

  test("accepts weekly slots without date bounds", () => {
    expect(
      teacherAvailabilitySchema.safeParse([
        {
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          recurrence: "WEEKLY",
          ...baseSlot,
        },
      ]).success,
    ).toBe(true);
  });

  test("rejects weekly slots when Until is before From", () => {
    expect(
      teacherAvailabilitySchema.safeParse([
        {
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          recurrence: "WEEKLY",
          startsOn: "2026-06-16",
          endsOn: "2026-04-16",
          ...baseSlot,
        },
      ]).success,
    ).toBe(false);
  });
});
