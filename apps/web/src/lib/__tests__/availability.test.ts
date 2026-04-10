import { describe, expect, test } from "vitest";
import { buildUpcomingSlotOptions } from "@/lib/availability";

describe("buildUpcomingSlotOptions", () => {
  test("builds upcoming UTC slot from teacher weekly availability", () => {
    const slots = buildUpcomingSlotOptions({
      availabilitySlots: [
        {
          id: "a1",
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          timezone: "Asia/Tokyo",
        },
      ],
      viewerTimezone: "Asia/Tokyo",
      now: "2026-04-10T00:00:00.000Z",
      horizonDays: 7,
    });

    expect(slots[0]?.startsAtIso).toBe("2026-04-13T01:00:00.000Z");
    expect(slots[0]?.endsAtIso).toBe("2026-04-13T02:00:00.000Z");
  });

  test("skips slots that already started", () => {
    const slots = buildUpcomingSlotOptions({
      availabilitySlots: [
        {
          id: "a1",
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          timezone: "Asia/Tokyo",
        },
      ],
      viewerTimezone: "Asia/Tokyo",
      now: "2026-04-13T01:30:00.000Z",
      horizonDays: 7,
    });

    expect(slots.some((s) => s.startsAtIso === "2026-04-13T01:00:00.000Z")).toBe(false);
  });

  test("skips slots inside minimum lead window", () => {
    const slots = buildUpcomingSlotOptions({
      availabilitySlots: [
        {
          id: "a1",
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          timezone: "Asia/Tokyo",
        },
      ],
      viewerTimezone: "Asia/Tokyo",
      now: "2026-04-11T03:00:00.000Z",
      horizonDays: 7,
      minimumLeadHours: 48,
    });

    expect(slots.some((s) => s.startsAtIso === "2026-04-13T01:00:00.000Z")).toBe(false);
  });
});
