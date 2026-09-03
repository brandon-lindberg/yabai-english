import { describe, expect, test } from "vitest";
import { seatState, takenSeatCount } from "@/lib/group-lesson-seats";

const now = new Date("2026-09-01T13:00:00.000Z");

const confirmed = { status: "CONFIRMED" as const, holdExpiresAt: null };
const heldUnpaid = {
  status: "PENDING_PAYMENT" as const,
  holdExpiresAt: new Date("2026-09-01T14:00:00.000Z"),
};
const lapsedUnpaid = {
  status: "PENDING_PAYMENT" as const,
  holdExpiresAt: new Date("2026-09-01T12:00:00.000Z"),
};
const cancelled = { status: "CANCELLED" as const, holdExpiresAt: null };

describe("takenSeatCount", () => {
  test("counts confirmed seats", () => {
    expect(takenSeatCount([confirmed, confirmed], now)).toBe(2);
  });

  test("counts an unpaid seat while its hold stands", () => {
    expect(takenSeatCount([confirmed, heldUnpaid], now)).toBe(2);
  });

  // The seat frees itself when the hold lapses — there is no worker in this
  // deployment, and a counter column could not express this at all.
  test("frees a seat whose hold has lapsed", () => {
    expect(takenSeatCount([confirmed, lapsedUnpaid], now)).toBe(1);
  });

  test("frees a cancelled seat", () => {
    expect(takenSeatCount([confirmed, cancelled], now)).toBe(1);
  });

  test("an empty class has nobody in it", () => {
    expect(takenSeatCount([], now)).toBe(0);
  });
});

describe("seatState", () => {
  test("reports what is taken and what is left", () => {
    expect(seatState({ capacity: 5, bookings: [confirmed, confirmed], now })).toEqual({
      capacity: 5,
      taken: 2,
      remaining: 3,
      full: false,
    });
  });

  test("an untouched class is entirely open", () => {
    expect(seatState({ capacity: 4, bookings: [], now })).toEqual({
      capacity: 4,
      taken: 0,
      remaining: 4,
      full: false,
    });
  });

  test("the last seat closes the class", () => {
    expect(
      seatState({ capacity: 2, bookings: [confirmed, heldUnpaid], now }),
    ).toMatchObject({ taken: 2, remaining: 0, full: true });
  });

  test("a lapsed hold reopens a full class", () => {
    expect(
      seatState({ capacity: 2, bookings: [confirmed, lapsedUnpaid], now }),
    ).toMatchObject({ taken: 1, remaining: 1, full: false });
  });

  // A session snapshots its capacity, so a teacher lowering groupSize later
  // cannot evict anyone. If a session ever does end up over its own capacity,
  // it reports no seats left rather than a negative number.
  test("never reports negative seats when taken exceeds capacity", () => {
    expect(
      seatState({ capacity: 2, bookings: [confirmed, confirmed, confirmed], now }),
    ).toEqual({ capacity: 2, taken: 3, remaining: 0, full: true });
  });
});
