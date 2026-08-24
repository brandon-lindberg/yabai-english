import { describe, expect, test } from "vitest";
import {
  countOpenAvailabilitySlots,
  slotHasOpenOccurrence,
  type OpenAvailabilitySlot,
} from "@/lib/dashboard/teacher-open-availability";

const TOKYO = "Asia/Tokyo";
// Monday 2026-08-24 10:00 JST.
const NOW = new Date("2026-08-24T01:00:00.000Z");

function oneOff(date: string, startMin = 600, endMin = 640): OpenAvailabilitySlot {
  return {
    id: `one-off-${date}-${startMin}`,
    dayOfWeek: 0,
    startMin,
    endMin,
    timezone: TOKYO,
    recurrence: "ONE_OFF",
    startsOn: date,
  };
}

describe("slotHasOpenOccurrence", () => {
  test("a one-off slot whose date has passed is not open", () => {
    expect(
      slotHasOpenOccurrence({ slot: oneOff("2026-08-10"), now: NOW }),
    ).toBe(false);
  });

  test("a one-off slot earlier today is not open", () => {
    expect(
      slotHasOpenOccurrence({ slot: oneOff("2026-08-24", 480, 520), now: NOW }),
    ).toBe(false);
  });

  test("a one-off slot later today is open", () => {
    expect(
      slotHasOpenOccurrence({ slot: oneOff("2026-08-24", 900, 940), now: NOW }),
    ).toBe(true);
  });

  test("a future one-off slot whose occurrence is booked is not open", () => {
    expect(
      slotHasOpenOccurrence({
        slot: oneOff("2026-08-30", 630, 670),
        // 2026-08-30 10:30-11:10 JST.
        bookings: [
          {
            startsAtIso: "2026-08-30T01:30:00.000Z",
            endsAtIso: "2026-08-30T02:10:00.000Z",
          },
        ],
        now: NOW,
      }),
    ).toBe(false);
  });

  test("a future one-off slot whose occurrence is skipped is not open", () => {
    expect(
      slotHasOpenOccurrence({
        slot: oneOff("2026-08-30", 630, 670),
        skippedStartsAtIso: new Set(["2026-08-30T01:30:00.000Z"]),
        now: NOW,
      }),
    ).toBe(false);
  });

  test("a weekly slot stays open when only its next occurrence is booked", () => {
    const weekly: OpenAvailabilitySlot = {
      id: "weekly",
      dayOfWeek: 2,
      startMin: 630,
      endMin: 670,
      timezone: TOKYO,
      recurrence: "WEEKLY",
    };
    expect(
      slotHasOpenOccurrence({
        slot: weekly,
        // Tuesday 2026-08-25 10:30 JST only.
        bookings: [
          {
            startsAtIso: "2026-08-25T01:30:00.000Z",
            endsAtIso: "2026-08-25T02:10:00.000Z",
          },
        ],
        now: NOW,
      }),
    ).toBe(true);
  });

  test("a weekly slot past its endsOn is not open", () => {
    expect(
      slotHasOpenOccurrence({
        slot: {
          id: "expired-weekly",
          dayOfWeek: 2,
          startMin: 630,
          endMin: 670,
          timezone: TOKYO,
          recurrence: "WEEKLY",
          startsOn: "2026-06-01",
          endsOn: "2026-08-01",
        },
        now: NOW,
      }),
    ).toBe(false);
  });

  test("accepts Date bounds as stored by Prisma", () => {
    expect(
      slotHasOpenOccurrence({
        slot: {
          ...oneOff("2026-08-10"),
          startsOn: new Date("2026-08-10T00:00:00.000Z"),
        },
        now: NOW,
      }),
    ).toBe(false);
  });
});

describe("countOpenAvailabilitySlots", () => {
  test("counts only slots with a free occurrence ahead", () => {
    const slots: OpenAvailabilitySlot[] = [
      oneOff("2026-08-10"), // past
      oneOff("2026-08-17"), // past
      oneOff("2026-08-30", 630, 670), // booked
      oneOff("2026-09-01"), // open
      oneOff("2026-09-08"), // open
    ];

    expect(
      countOpenAvailabilitySlots({
        slots,
        bookings: [
          {
            startsAtIso: "2026-08-30T01:30:00.000Z",
            endsAtIso: "2026-08-30T02:10:00.000Z",
          },
        ],
        now: NOW,
      }),
    ).toBe(2);
  });

  test("returns 0 for no slots", () => {
    expect(countOpenAvailabilitySlots({ slots: [], now: NOW })).toBe(0);
  });
});
