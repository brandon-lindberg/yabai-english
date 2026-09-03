import { describe, expect, test } from "vitest";
import { occurrenceBookability } from "@/lib/occurrence-bookability";

const occurrence = {
  startsAtIso: "2026-07-05T01:30:00.000Z",
  endsAtIso: "2026-07-05T02:30:00.000Z",
};

const overlapping = {
  startsAtIso: "2026-07-05T02:00:00.000Z",
  endsAtIso: "2026-07-05T03:00:00.000Z",
};

const elsewhere = {
  startsAtIso: "2026-07-06T01:30:00.000Z",
  endsAtIso: "2026-07-06T02:30:00.000Z",
};

describe("occurrenceBookability — private lessons", () => {
  test("an untouched private slot is open", () => {
    expect(occurrenceBookability({ occurrence, seats: null, blocking: [] })).toEqual({
      state: "open",
      seats: null,
    });
  });

  test("a private slot somebody booked is taken", () => {
    expect(
      occurrenceBookability({ occurrence, seats: null, blocking: [overlapping] }),
    ).toEqual({ state: "taken", seats: null });
  });

  test("a booking elsewhere leaves it open", () => {
    expect(
      occurrenceBookability({ occurrence, seats: null, blocking: [elsewhere] }),
    ).toMatchObject({ state: "open" });
  });

  test("a lesson ending exactly when this one starts does not block it", () => {
    expect(
      occurrenceBookability({
        occurrence,
        seats: null,
        blocking: [
          { startsAtIso: "2026-07-05T00:30:00.000Z", endsAtIso: "2026-07-05T01:30:00.000Z" },
        ],
      }),
    ).toMatchObject({ state: "open" });
  });
});

describe("occurrenceBookability — group classes", () => {
  test("an empty class is open with every seat free", () => {
    expect(
      occurrenceBookability({
        occurrence,
        seats: { capacity: 5, taken: 0 },
        blocking: [],
      }),
    ).toEqual({
      state: "open",
      seats: { capacity: 5, taken: 0, remaining: 5, full: false },
    });
  });

  // The point of the whole feature: a class other people are already in is
  // still bookable, and says how much room is left.
  test("a partly filled class stays open and reports the room left", () => {
    expect(
      occurrenceBookability({
        occurrence,
        seats: { capacity: 5, taken: 2 },
        blocking: [],
      }),
    ).toMatchObject({ state: "open", seats: { remaining: 3 } });
  });

  test("the last seat closes the class", () => {
    expect(
      occurrenceBookability({
        occurrence,
        seats: { capacity: 5, taken: 5 },
        blocking: [],
      }),
    ).toMatchObject({ state: "full", seats: { remaining: 0, full: true } });
  });

  // Classmates are counted as seats, never as bookings that block the class:
  // passing them in `blocking` would hide the class from its own students.
  test("a private lesson at that time still closes the class", () => {
    expect(
      occurrenceBookability({
        occurrence,
        seats: { capacity: 5, taken: 1 },
        blocking: [overlapping],
      }),
    ).toMatchObject({ state: "taken" });
  });

  test("an over-subscribed class reports no seats rather than negative ones", () => {
    expect(
      occurrenceBookability({
        occurrence,
        seats: { capacity: 2, taken: 3 },
        blocking: [],
      }),
    ).toMatchObject({ state: "full", seats: { remaining: 0 } });
  });
});
