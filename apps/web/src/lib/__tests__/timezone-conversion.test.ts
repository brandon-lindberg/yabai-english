import { describe, expect, test } from "vitest";
import { buildUpcomingSlotOptions } from "@/lib/availability";
import { dayKeyFromIso, formatDayKeyLabel } from "@/lib/slot-calendar";

describe("timezone conversion", () => {
  test("converts teacher availability to student timezone correctly", () => {
    const slots = buildUpcomingSlotOptions({
      availabilitySlots: [
        {
          id: "slot-1",
          dayOfWeek: 0,
          startMin: 10 * 60 + 30,
          endMin: 11 * 60 + 10,
          timezone: "Asia/Tokyo",
          recurrence: "ONE_OFF",
          startsOn: "2026-07-05",
          classLevelId: "level-1",
          classTypeId: "type-1",
        },
      ],
      viewerTimezone: "America/New_York",
      now: "2026-06-20T00:00:00.000Z",
      horizonDays: 30,
    });

    expect(slots[0]?.startsAtIso).toBe("2026-07-05T01:30:00.000Z");
    expect(slots[0]?.label).toContain("Sat, Jul 4 21:30");
    expect(slots[0]?.label).toContain("America/New_York");
  });

  test("groups one instant by the viewer timezone day", () => {
    const lessonStart = "2026-07-05T01:30:00.000Z";

    expect(dayKeyFromIso(lessonStart, "Asia/Tokyo")).toBe("2026-07-05");
    expect(dayKeyFromIso(lessonStart, "America/New_York")).toBe("2026-07-04");
  });

  test("formats date-only calendar labels in the target timezone date", () => {
    expect(
      formatDayKeyLabel("2026-07-04", "en-US", { month: "short", day: "numeric" }, "Pacific/Kiritimati"),
    ).toBe("Jul 4");
  });

  test("handles DST boundaries for displayed lesson time", () => {
    const slots = buildUpcomingSlotOptions({
      availabilitySlots: [
        {
          id: "slot-1",
          dayOfWeek: 0,
          startMin: 10 * 60 + 30,
          endMin: 11 * 60 + 10,
          timezone: "Asia/Tokyo",
          recurrence: "ONE_OFF",
          startsOn: "2026-12-06",
          classLevelId: "level-1",
          classTypeId: "type-1",
        },
      ],
      viewerTimezone: "America/New_York",
      now: "2026-11-20T00:00:00.000Z",
      horizonDays: 30,
    });

    expect(slots[0]?.startsAtIso).toBe("2026-12-06T01:30:00.000Z");
    expect(slots[0]?.label).toContain("Sat, Dec 5 20:30");
  });
});
