import { describe, expect, test } from "vitest";
import { evaluateSchoolBookingRescheduleTimes } from "@/lib/school-booking-reschedule-policy";

describe("evaluateSchoolBookingRescheduleTimes", () => {
  const now = new Date("2026-05-10T12:00:00.000Z");
  const previous = new Date("2026-05-24T01:00:00.000Z");

  test("rejects new start in the past", () => {
    const r = evaluateSchoolBookingRescheduleTimes({
      previousStartsAt: previous,
      newStartsAt: new Date("2026-05-09T15:00:00.000Z"),
      now,
    });
    expect(r).toEqual({ ok: false, reason: "NEW_START_IN_PAST_OR_PRESENT" });
  });

  test("rejects new start exactly at now", () => {
    const r = evaluateSchoolBookingRescheduleTimes({
      previousStartsAt: previous,
      newStartsAt: new Date(now.getTime()),
      now,
    });
    expect(r).toEqual({ ok: false, reason: "NEW_START_IN_PAST_OR_PRESENT" });
  });

  test("allows future new start", () => {
    const newStart = new Date("2026-05-24T01:30:00.000Z");
    const r = evaluateSchoolBookingRescheduleTimes({
      previousStartsAt: previous,
      newStartsAt: newStart,
      now,
    });
    expect(r).toEqual({ ok: true, unchanged: false });
  });

  test("marks unchanged when new start equals previous", () => {
    const r = evaluateSchoolBookingRescheduleTimes({
      previousStartsAt: previous,
      newStartsAt: new Date(previous.getTime()),
      now,
    });
    expect(r).toEqual({ ok: true, unchanged: true });
  });
});
