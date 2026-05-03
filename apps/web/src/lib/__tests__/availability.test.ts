import { describe, expect, test } from "vitest";
import { buildUpcomingSlotOptions } from "@/lib/availability";

const baseSlot = {
  id: "a1",
  dayOfWeek: 1,
  startMin: 10 * 60,
  endMin: 11 * 60,
  timezone: "Asia/Tokyo",
  classLevelId: "lvl-int",
  classTypeId: "ty-conv",
};

describe("buildUpcomingSlotOptions", () => {
  test("builds upcoming UTC slot from teacher weekly availability", () => {
    const slots = buildUpcomingSlotOptions({
      availabilitySlots: [baseSlot],
      viewerTimezone: "Asia/Tokyo",
      now: "2026-04-10T00:00:00.000Z",
      horizonDays: 7,
    });

    expect(slots[0]?.startsAtIso).toBe("2026-04-13T01:00:00.000Z");
    expect(slots[0]?.endsAtIso).toBe("2026-04-13T02:00:00.000Z");
  });

  test("builds only the selected date for one-off availability", () => {
    const slots = buildUpcomingSlotOptions({
      availabilitySlots: [
        {
          ...baseSlot,
          dayOfWeek: 5,
          recurrence: "ONE_OFF",
          startsOn: "2026-05-15",
        },
      ],
      viewerTimezone: "Asia/Tokyo",
      now: "2026-05-01T00:00:00.000Z",
      horizonDays: 30,
    });

    expect(slots.map((s) => s.startsAtIso)).toEqual(["2026-05-15T01:00:00.000Z"]);
  });

  test("clips weekly availability to From and Until dates", () => {
    const slots = buildUpcomingSlotOptions({
      availabilitySlots: [
        {
          ...baseSlot,
          recurrence: "WEEKLY",
          startsOn: "2026-04-13",
          endsOn: "2026-04-27",
        },
      ],
      viewerTimezone: "Asia/Tokyo",
      now: "2026-04-01T00:00:00.000Z",
      horizonDays: 60,
    });

    expect(slots.map((s) => s.startsAtIso)).toEqual([
      "2026-04-13T01:00:00.000Z",
      "2026-04-20T01:00:00.000Z",
      "2026-04-27T01:00:00.000Z",
    ]);
  });

  test("skips slots that already started", () => {
    const slots = buildUpcomingSlotOptions({
      availabilitySlots: [baseSlot],
      viewerTimezone: "Asia/Tokyo",
      now: "2026-04-13T01:30:00.000Z",
      horizonDays: 7,
    });

    expect(slots.some((s) => s.startsAtIso === "2026-04-13T01:00:00.000Z")).toBe(false);
  });

  test("skips slots inside minimum lead window", () => {
    const slots = buildUpcomingSlotOptions({
      availabilitySlots: [baseSlot],
      viewerTimezone: "Asia/Tokyo",
      now: "2026-04-11T03:00:00.000Z",
      horizonDays: 7,
      minimumLeadHours: 48,
    });

    expect(slots.some((s) => s.startsAtIso === "2026-04-13T01:00:00.000Z")).toBe(false);
  });

  test("skippedStartsAtIso omits matching occurrences", () => {
    const skip = new Set(["2026-04-13T01:00:00.000Z"]);
    const slots = buildUpcomingSlotOptions({
      availabilitySlots: [baseSlot],
      viewerTimezone: "Asia/Tokyo",
      now: "2026-04-10T00:00:00.000Z",
      horizonDays: 14,
      allowPastInstances: true,
      skippedStartsAtIso: skip,
    });

    expect(slots.some((s) => s.startsAtIso === "2026-04-13T01:00:00.000Z")).toBe(false);
    expect(slots.length).toBeGreaterThan(0);
  });

  test("allowPastInstances includes slots that already started within horizon", () => {
    const slots = buildUpcomingSlotOptions({
      availabilitySlots: [baseSlot],
      viewerTimezone: "Asia/Tokyo",
      now: "2026-04-13T01:30:00.000Z",
      horizonDays: 7,
      allowPastInstances: true,
    });

    expect(slots.some((s) => s.startsAtIso === "2026-04-13T01:00:00.000Z")).toBe(true);
  });

  test("returned slots carry the originating classTypeId", () => {
    const slots = buildUpcomingSlotOptions({
      availabilitySlots: [{ ...baseSlot, classTypeId: "ty-custom" }],
      viewerTimezone: "Asia/Tokyo",
      now: "2026-04-10T00:00:00.000Z",
      horizonDays: 7,
    });

    expect(slots[0]?.classTypeId).toBe("ty-custom");
  });

  test("formatLessonMeta appends to label when provided", () => {
    const slots = buildUpcomingSlotOptions({
      availabilitySlots: [baseSlot],
      viewerTimezone: "Asia/Tokyo",
      now: "2026-04-10T00:00:00.000Z",
      horizonDays: 7,
      formatLessonMeta: () => "B1 · Grammar",
    });

    expect(slots[0]?.label.endsWith(" · B1 · Grammar")).toBe(true);
  });
});
