import { describe, expect, test } from "vitest";
import { buildUpcomingSlotOptions } from "@/lib/availability";
import { validateBookingAgainstTeacherAvailability } from "@/lib/booking-slot-validation";

describe("validateBookingAgainstTeacherAvailability", () => {
  const now = new Date("2026-05-10T00:00:00.000Z");
  const slot = {
    id: "slot-1",
    dayOfWeek: 1,
    startMin: 10 * 60,
    endMin: 11 * 60,
    timezone: "Asia/Tokyo",
    recurrence: "WEEKLY" as const,
    startsOn: null,
    endsOn: null,
    classLevelId: "lvl-1",
    classTypeId: "type-1",
  };
  const validStartsAtIso = buildUpcomingSlotOptions({
    availabilitySlots: [slot],
    viewerTimezone: "Asia/Tokyo",
    minimumLeadHours: 48,
    now,
  })[0]!.startsAtIso;

  test("accepts a valid upcoming slot with matching duration", () => {
    const options = validateBookingAgainstTeacherAvailability({
      startsAtIso: validStartsAtIso,
      durationMin: 60,
      availabilitySlots: [slot],
      viewerTimezone: "Asia/Tokyo",
      now,
    });

    expect(options).toEqual({
      ok: true,
      slotId: "slot-1",
      classTypeId: "type-1",
    });
  });

  test("rejects a time that is not on the teacher availability calendar", () => {
    const result = validateBookingAgainstTeacherAvailability({
      startsAtIso: "2026-05-19T02:30:00.000Z",
      durationMin: 60,
      availabilitySlots: [slot],
      viewerTimezone: "Asia/Tokyo",
      now,
    });

    expect(result).toEqual({
      ok: false,
      error: "The selected time is not available.",
    });
  });

  test("rejects skipped occurrences", () => {
    const result = validateBookingAgainstTeacherAvailability({
      startsAtIso: validStartsAtIso,
      durationMin: 60,
      availabilitySlots: [slot],
      occurrenceSkips: [validStartsAtIso],
      viewerTimezone: "Asia/Tokyo",
      now,
    });

    expect(result).toEqual({
      ok: false,
      error: "The selected time is not available.",
    });
  });

  test("rejects when lesson duration exceeds the slot window", () => {
    const result = validateBookingAgainstTeacherAvailability({
      startsAtIso: validStartsAtIso,
      durationMin: 90,
      availabilitySlots: [slot],
      viewerTimezone: "Asia/Tokyo",
      now,
    });

    expect(result).toEqual({
      ok: false,
      error: "The lesson duration does not fit in the selected time slot.",
    });
  });
});
