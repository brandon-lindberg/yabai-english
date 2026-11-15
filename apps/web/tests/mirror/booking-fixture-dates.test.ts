import { expect, test } from "vitest";
import { refundableMonday } from "../../test/mirror-booking-dates";
import { evaluateBookingCancellationPolicy } from "../../src/lib/booking-policy";

test.each([
  ["2026-11-12T12:00:00Z", "2026-11-16T01:00:00.000Z"],
  ["2026-11-13T00:00:00Z", "2026-11-16T01:00:00.000Z"],
  ["2026-11-13T02:00:00Z", "2026-11-23T01:00:00.000Z"],
  ["2026-11-14T12:00:00Z", "2026-11-23T01:00:00.000Z"],
  ["2026-11-15T12:00:00Z", "2026-11-23T01:00:00.000Z"],
  ["2026-11-16T00:00:00Z", "2026-11-23T01:00:00.000Z"],
  ["2026-12-31T12:00:00Z", "2027-01-04T01:00:00.000Z"],
])("keeps the early cancellation fixture refundable when created at %s", (iso, expected) => {
  const now = new Date(iso);
  const start = refundableMonday(now);
  expect(start.toISOString()).toBe(expected);
  expect(start.getUTCDay()).toBe(1);
  expect(start.getUTCHours()).toBe(1); // Teacher's Monday 10:00 JST slot.
  expect(start.getTime() - now.getTime()).toBeGreaterThanOrEqual(72 * 3600_000);
  expect(now.toISOString()).toBe(new Date(iso).toISOString());
  expect(evaluateBookingCancellationPolicy({ actor: "STUDENT", bookingStatus: "CONFIRMED", lessonStartsAt: start, now }))
    .toEqual({ allowed: true, refundEligible: true, rescheduleOffered: false });
});
