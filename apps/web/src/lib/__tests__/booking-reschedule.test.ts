import { describe, expect, test } from "vitest";
import {
  evaluateBookingReschedulePolicy,
  MAX_STUDENT_RESCHEDULES,
} from "@/lib/booking-reschedule";

const t0 = new Date("2026-04-10T12:00:00.000Z");
const base = {
  actor: "STUDENT" as const,
  bookingStatus: "CONFIRMED" as const,
  lessonStartsAt: new Date("2026-04-11T12:00:00.000Z"), // 24h out — inside the window
  rescheduleCount: 0,
  now: t0,
};

describe("evaluateBookingReschedulePolicy", () => {
  test("lets a student move a confirmed lesson instead of losing the fee", () => {
    expect(evaluateBookingReschedulePolicy(base)).toEqual({ allowed: true });
  });

  test("lets a student move a lesson that is still far off", () => {
    expect(
      evaluateBookingReschedulePolicy({
        ...base,
        lessonStartsAt: new Date("2026-04-30T12:00:00.000Z"),
      }),
    ).toEqual({ allowed: true });
  });

  test("the teacher may move their own lesson too", () => {
    expect(evaluateBookingReschedulePolicy({ ...base, actor: "TEACHER" })).toEqual({
      allowed: true,
    });
  });

  // The lesson is paid for and stays paid for — an unpaid booking has nothing to
  // preserve, so it should be cancelled and rebooked rather than moved.
  test("refuses a booking that has not been paid for", () => {
    expect(
      evaluateBookingReschedulePolicy({ ...base, bookingStatus: "PENDING_PAYMENT" }),
    ).toEqual({ allowed: false, reason: "NOT_CONFIRMED" });
  });

  test.each(["CANCELLED", "COMPLETED"] as const)("refuses a %s booking", (bookingStatus) => {
    expect(evaluateBookingReschedulePolicy({ ...base, bookingStatus })).toEqual({
      allowed: false,
      reason: "NOT_CONFIRMED",
    });
  });

  test("refuses once the lesson has already started", () => {
    expect(
      evaluateBookingReschedulePolicy({
        ...base,
        lessonStartsAt: new Date("2026-04-10T11:59:00.000Z"),
      }),
    ).toEqual({ allowed: false, reason: "ALREADY_STARTED" });
  });

  // Without a cap a student could move the same paid lesson indefinitely, which
  // holds the teacher's time hostage at no cost.
  test("refuses once the student has used their reschedules", () => {
    expect(
      evaluateBookingReschedulePolicy({ ...base, rescheduleCount: MAX_STUDENT_RESCHEDULES }),
    ).toEqual({ allowed: false, reason: "LIMIT_REACHED" });
    expect(MAX_STUDENT_RESCHEDULES).toBe(1);
  });

  test("the limit does not apply to the teacher", () => {
    expect(
      evaluateBookingReschedulePolicy({
        ...base,
        actor: "TEACHER",
        rescheduleCount: MAX_STUDENT_RESCHEDULES + 5,
      }),
    ).toEqual({ allowed: true });
  });
});
