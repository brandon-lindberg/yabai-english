import { describe, expect, test } from "vitest";
import { BookingStatus } from "@/generated/prisma/client";
import { evaluateBookingRescheduleTimes } from "@/lib/booking-reschedule-policy";

describe("evaluateBookingRescheduleTimes", () => {
  const now = new Date("2026-05-10T12:00:00.000Z");
  const previous = new Date("2026-05-24T01:00:00.000Z"); // arbitrary past relative to scenario

  test("rejects CANCELLED", () => {
    const r = evaluateBookingRescheduleTimes({
      bookingStatus: BookingStatus.CANCELLED,
      previousStartsAt: previous,
      newStartsAt: new Date("2026-05-24T02:30:00.000Z"),
      now,
    });
    expect(r).toEqual({ ok: false, reason: "INVALID_STATUS" });
  });

  test("rejects COMPLETED", () => {
    const r = evaluateBookingRescheduleTimes({
      bookingStatus: BookingStatus.COMPLETED,
      previousStartsAt: previous,
      newStartsAt: new Date("2026-05-24T02:30:00.000Z"),
      now,
    });
    expect(r).toEqual({ ok: false, reason: "INVALID_STATUS" });
  });

  test("rejects new start in the past", () => {
    const r = evaluateBookingRescheduleTimes({
      bookingStatus: BookingStatus.CONFIRMED,
      previousStartsAt: previous,
      newStartsAt: new Date("2026-05-09T15:00:00.000Z"),
      now,
    });
    expect(r).toEqual({ ok: false, reason: "NEW_START_IN_PAST_OR_PRESENT" });
  });

  test("rejects new start exactly at now", () => {
    const r = evaluateBookingRescheduleTimes({
      bookingStatus: BookingStatus.CONFIRMED,
      previousStartsAt: previous,
      newStartsAt: new Date(now.getTime()),
      now,
    });
    expect(r).toEqual({ ok: false, reason: "NEW_START_IN_PAST_OR_PRESENT" });
  });

  test("allows CONFIRMED with future new start", () => {
    const newStart = new Date("2026-05-24T01:30:00.000Z");
    const r = evaluateBookingRescheduleTimes({
      bookingStatus: BookingStatus.CONFIRMED,
      previousStartsAt: previous,
      newStartsAt: newStart,
      now,
    });
    expect(r).toEqual({ ok: true, unchanged: false });
  });

  test("allows PENDING_PAYMENT with future new start", () => {
    const newStart = new Date("2026-05-31T02:00:00.000Z");
    const r = evaluateBookingRescheduleTimes({
      bookingStatus: BookingStatus.PENDING_PAYMENT,
      previousStartsAt: previous,
      newStartsAt: newStart,
      now,
    });
    expect(r).toEqual({ ok: true, unchanged: false });
  });

  test("marks unchanged when new start equals previous", () => {
    const r = evaluateBookingRescheduleTimes({
      bookingStatus: BookingStatus.CONFIRMED,
      previousStartsAt: previous,
      newStartsAt: new Date(previous.getTime()),
      now,
    });
    expect(r).toEqual({ ok: true, unchanged: true });
  });
});
