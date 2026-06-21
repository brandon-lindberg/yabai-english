import { describe, expect, test } from "vitest";
import { bookingStartMatchesTeacherAvailability } from "@/lib/booking-availability-match";

const tokyoSunday1030Slot = {
  dayOfWeek: 0,
  startMin: 10 * 60 + 30,
  endMin: 11 * 60 + 10,
  timezone: "Asia/Tokyo",
  recurrence: "WEEKLY" as const,
  startsOn: "2026-06-21",
  endsOn: null,
  teacherLessonOfferingId: "offer-40",
  classTypeId: "ty-conv",
};

describe("bookingStartMatchesTeacherAvailability", () => {
  test("accepts the UTC instant for a 10:30 JST availability slot", () => {
    expect(
      bookingStartMatchesTeacherAvailability({
        availabilitySlots: [tokyoSunday1030Slot],
        startsAt: new Date("2026-07-05T01:30:00.000Z"),
        durationMin: 40,
        selectedOffering: {
          id: "offer-40",
          durationMin: 40,
          classTypeId: "ty-conv",
        },
      }),
    ).toBe(true);
  });

  test("rejects a UTC-clock 10:30 payload for a 10:30 JST availability slot", () => {
    expect(
      bookingStartMatchesTeacherAvailability({
        availabilitySlots: [tokyoSunday1030Slot],
        startsAt: new Date("2026-07-05T10:30:00.000Z"),
        durationMin: 40,
        selectedOffering: {
          id: "offer-40",
          durationMin: 40,
          classTypeId: "ty-conv",
        },
      }),
    ).toBe(false);
  });

  test("rejects skipped availability occurrences", () => {
    expect(
      bookingStartMatchesTeacherAvailability({
        availabilitySlots: [tokyoSunday1030Slot],
        startsAt: new Date("2026-07-05T01:30:00.000Z"),
        durationMin: 40,
        selectedOffering: {
          id: "offer-40",
          durationMin: 40,
          classTypeId: "ty-conv",
        },
        skippedStartsAtIso: new Set(["2026-07-05T01:30:00.000Z"]),
      }),
    ).toBe(false);
  });
});
