import { describe, expect, test } from "vitest";
import {
  filterAvailabilityOverlappingBookings,
  timeRangesOverlap,
} from "@/lib/teacher-availability-display";

describe("timeRangesOverlap", () => {
  test("returns true when intervals share time", () => {
    expect(
      timeRangesOverlap(
        { startsAtIso: "2026-06-07T01:30:00.000Z", endsAtIso: "2026-06-07T02:10:00.000Z" },
        { startsAtIso: "2026-06-07T01:30:00.000Z", endsAtIso: "2026-06-07T02:10:00.000Z" },
      ),
    ).toBe(true);
  });

  test("returns false when intervals are adjacent but not overlapping", () => {
    expect(
      timeRangesOverlap(
        { startsAtIso: "2026-06-07T01:00:00.000Z", endsAtIso: "2026-06-07T02:00:00.000Z" },
        { startsAtIso: "2026-06-07T02:00:00.000Z", endsAtIso: "2026-06-07T03:00:00.000Z" },
      ),
    ).toBe(false);
  });
});

describe("filterAvailabilityOverlappingBookings", () => {
  test("removes availability that overlaps a booking", () => {
    const availability = [
      {
        startsAtIso: "2026-06-07T01:30:00.000Z",
        endsAtIso: "2026-06-07T02:10:00.000Z",
        label: "open",
      },
      {
        startsAtIso: "2026-06-07T04:00:00.000Z",
        endsAtIso: "2026-06-07T05:00:00.000Z",
        label: "later",
      },
    ];
    const bookings = [
      {
        startsAtIso: "2026-06-07T01:30:00.000Z",
        endsAtIso: "2026-06-07T02:10:00.000Z",
      },
    ];

    expect(filterAvailabilityOverlappingBookings(availability, bookings)).toEqual([
      availability[1],
    ]);
  });

  test("returns all availability when there are no bookings", () => {
    const availability = [
      {
        startsAtIso: "2026-06-07T01:30:00.000Z",
        endsAtIso: "2026-06-07T02:10:00.000Z",
        label: "open",
      },
    ];
    expect(filterAvailabilityOverlappingBookings(availability, [])).toEqual(availability);
  });
});
