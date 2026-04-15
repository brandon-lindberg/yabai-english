import { describe, expect, test } from "vitest";
import { teacherAvailabilitySchema } from "@/lib/teacher-availability";

describe("teacherAvailabilitySchema", () => {
  test("rejects end time at or before start on the same day (e.g. noon to midnight)", () => {
    expect(
      teacherAvailabilitySchema.safeParse([
        { dayOfWeek: 1, startMin: 10 * 60, endMin: 0, timezone: "Asia/Tokyo" },
      ]).success,
    ).toBe(false);
    expect(
      teacherAvailabilitySchema.safeParse([
        { dayOfWeek: 1, startMin: 10 * 60, endMin: 10 * 60, timezone: "Asia/Tokyo" },
      ]).success,
    ).toBe(false);
  });

  test("accepts end after start on the same calendar day", () => {
    expect(
      teacherAvailabilitySchema.safeParse([
        { dayOfWeek: 1, startMin: 10 * 60, endMin: 12 * 60, timezone: "Asia/Tokyo" },
      ]).success,
    ).toBe(true);
  });
});
