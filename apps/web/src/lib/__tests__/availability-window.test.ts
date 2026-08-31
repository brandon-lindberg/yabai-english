import { describe, expect, test } from "vitest";
import {
  AVAILABILITY_WINDOW_MONTHS,
  availabilityWindowEndDayKey,
  canAdvanceCalendarWithinWindow,
  isWithinAvailabilityWindow,
} from "@/lib/availability-window";

const TZ = "Asia/Tokyo";

describe("availabilityWindowEndDayKey", () => {
  test("opens the current month and the two after it", () => {
    expect(AVAILABILITY_WINDOW_MONTHS).toBe(3);
    // Late August: August, September and October are open.
    expect(availabilityWindowEndDayKey(new Date("2026-08-31T00:00:00Z"), TZ)).toBe(
      "2026-10-31",
    );
  });

  test("moves a whole month forward the moment the month turns", () => {
    expect(availabilityWindowEndDayKey(new Date("2026-09-01T00:00:00Z"), TZ)).toBe(
      "2026-11-30",
    );
  });

  test("is the same for every day within a month, not a rolling 90 days", () => {
    const first = availabilityWindowEndDayKey(new Date("2026-08-01T00:00:00Z"), TZ);
    const last = availabilityWindowEndDayKey(new Date("2026-08-31T00:00:00Z"), TZ);
    expect(first).toBe(last);
  });

  test("carries across the year boundary", () => {
    expect(availabilityWindowEndDayKey(new Date("2026-12-05T00:00:00Z"), TZ)).toBe(
      "2027-02-28",
    );
  });

  test("lands on the real last day of a short or leap month", () => {
    expect(availabilityWindowEndDayKey(new Date("2028-01-10T00:00:00Z"), TZ)).toBe(
      "2028-03-31",
    );
    // 2028 is a leap year: February has 29 days.
    expect(availabilityWindowEndDayKey(new Date("2027-12-10T00:00:00Z"), TZ)).toBe(
      "2028-02-29",
    );
  });

  test("uses the teacher's own calendar, not UTC's", () => {
    // 23:00 UTC on Aug 31 is already Sep 1 in Tokyo, so Tokyo has turned over.
    const instant = new Date("2026-08-31T23:00:00Z");
    expect(availabilityWindowEndDayKey(instant, TZ)).toBe("2026-11-30");
    expect(availabilityWindowEndDayKey(instant, "UTC")).toBe("2026-10-31");
  });
});

describe("isWithinAvailabilityWindow", () => {
  const now = new Date("2026-08-31T00:00:00Z");

  test("accepts a date inside the window", () => {
    expect(isWithinAvailabilityWindow("2026-10-15", now, TZ)).toBe(true);
  });

  test("accepts the very last day of the window", () => {
    expect(isWithinAvailabilityWindow("2026-10-31", now, TZ)).toBe(true);
  });

  test("rejects the first day past the window", () => {
    expect(isWithinAvailabilityWindow("2026-11-01", now, TZ)).toBe(false);
  });

  test("leaves the past alone — this rule is only about how far ahead", () => {
    expect(isWithinAvailabilityWindow("2020-01-01", now, TZ)).toBe(true);
  });
});

describe("canAdvanceCalendarPast", () => {
  const now = new Date("2026-08-31T00:00:00Z");

  test("a month view may step forward while the next month is still inside the window", () => {
    expect(
      canAdvanceCalendarWithinWindow("2026-08-15T00:00:00.000Z", "month", now, TZ),
    ).toBe(true);
    expect(
      canAdvanceCalendarWithinWindow("2026-09-15T00:00:00.000Z", "month", now, TZ),
    ).toBe(true);
  });

  test("a month view stops on the last month of the window", () => {
    // October is the third month; November is past the edge.
    expect(
      canAdvanceCalendarWithinWindow("2026-10-15T00:00:00.000Z", "month", now, TZ),
    ).toBe(false);
  });

  test("a week view stops once the next week starts past the window", () => {
    expect(
      canAdvanceCalendarWithinWindow("2026-10-20T00:00:00.000Z", "week", now, TZ),
    ).toBe(true);
    expect(
      canAdvanceCalendarWithinWindow("2026-10-28T00:00:00.000Z", "week", now, TZ),
    ).toBe(false);
  });

  test("a day view stops on the final day of the window", () => {
    expect(
      canAdvanceCalendarWithinWindow("2026-10-30T00:00:00.000Z", "day", now, TZ),
    ).toBe(true);
    expect(
      canAdvanceCalendarWithinWindow("2026-10-31T00:00:00.000Z", "day", now, TZ),
    ).toBe(false);
  });
});
