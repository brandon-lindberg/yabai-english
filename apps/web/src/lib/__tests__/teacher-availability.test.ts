import { describe, expect, test } from "vitest";
import { teacherAvailabilitySchema } from "@/lib/teacher-availability";

const baseSlot = {
  timezone: "Asia/Tokyo",
  lessonLevel: "intermediate" as const,
  lessonType: "conversation" as const,
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

  test("requires non-empty lessonTypeCustom when lessonType is custom", () => {
    expect(
      teacherAvailabilitySchema.safeParse([
        {
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          timezone: "Asia/Tokyo",
          lessonLevel: "beginner",
          lessonType: "custom",
          lessonTypeCustom: "   ",
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
          lessonLevel: "beginner",
          lessonType: "custom",
          lessonTypeCustom: "Interview prep",
        },
      ]).success,
    ).toBe(true);
  });

  test("rejects unknown lesson level", () => {
    expect(
      teacherAvailabilitySchema.safeParse([
        {
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          timezone: "Asia/Tokyo",
          lessonLevel: "nope",
          lessonType: "grammar",
        },
      ]).success,
    ).toBe(false);
  });

  test("accepts business lesson type", () => {
    expect(
      teacherAvailabilitySchema.safeParse([
        {
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          timezone: "Asia/Tokyo",
          lessonLevel: "advanced",
          lessonType: "business",
        },
      ]).success,
    ).toBe(true);
  });
});
