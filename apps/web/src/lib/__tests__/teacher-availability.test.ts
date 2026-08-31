import { describe, expect, test } from "vitest";
import { teacherAvailabilitySchema } from "@/lib/teacher-availability";

const baseSlot = {
  timezone: "Asia/Tokyo",
  classLevelId: "lvl-int",
  classTypeId: "ty-conv",
  teacherLessonOfferingId: "offer-conv-40",
};

/** Weekly slots must be bounded, so a valid weekly fixture carries an end. */
const weeklyEnd = { endsOn: "2026-10-31" };

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
        { dayOfWeek: 1, startMin: 10 * 60, endMin: 12 * 60, ...baseSlot, ...weeklyEnd },
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
          ...weeklyEnd,
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

  test("rejects a weekly slot with no end date", () => {
    // An unbounded recurring slot keeps taking bookings after a teacher stops
    // using the app; extending it has to be a deliberate act.
    expect(
      teacherAvailabilitySchema.safeParse([
        {
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          recurrence: "WEEKLY",
          ...baseSlot,
          endsOn: null,
        },
      ]).success,
    ).toBe(false);
  });

  test("accepts a weekly slot that carries an end date", () => {
    expect(
      teacherAvailabilitySchema.safeParse([
        {
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          recurrence: "WEEKLY",
          ...baseSlot,
          ...weeklyEnd,
        },
      ]).success,
    ).toBe(true);
  });

  test("a one-off slot needs no end date", () => {
    expect(
      teacherAvailabilitySchema.safeParse([
        {
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          recurrence: "ONE_OFF",
          ...baseSlot,
          startsOn: "2026-10-05",
          endsOn: null,
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
