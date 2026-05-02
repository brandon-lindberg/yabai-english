import { describe, it, expect } from "vitest";
import {
  generateOccurrences,
  isOccurrenceSkipped,
  getCapacityDisplay,
  validateSlotTimes,
  findOccurrenceConflict,
  planMaterializedBookings,
} from "../school-scheduling";

describe("school-scheduling", () => {
  describe("validateSlotTimes", () => {
    it("accepts valid slot times", () => {
      const result = validateSlotTimes({
        dayOfWeek: 1,
        startMin: 540,
        endMin: 600,
        durationMin: 60,
        capacity: 5,
      });
      expect(result.valid).toBe(true);
    });

    it("rejects dayOfWeek < 0", () => {
      const result = validateSlotTimes({
        dayOfWeek: -1,
        startMin: 540,
        endMin: 600,
        durationMin: 60,
        capacity: 1,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("dayOfWeek");
    });

    it("rejects dayOfWeek > 6", () => {
      const result = validateSlotTimes({
        dayOfWeek: 7,
        startMin: 540,
        endMin: 600,
        durationMin: 60,
        capacity: 1,
      });
      expect(result.valid).toBe(false);
    });

    it("rejects startMin >= endMin", () => {
      const result = validateSlotTimes({
        dayOfWeek: 1,
        startMin: 600,
        endMin: 540,
        durationMin: 60,
        capacity: 1,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("start");
    });

    it("rejects startMin === endMin", () => {
      const result = validateSlotTimes({
        dayOfWeek: 1,
        startMin: 600,
        endMin: 600,
        durationMin: 60,
        capacity: 1,
      });
      expect(result.valid).toBe(false);
    });

    it("rejects negative startMin", () => {
      const result = validateSlotTimes({
        dayOfWeek: 1,
        startMin: -10,
        endMin: 60,
        durationMin: 60,
        capacity: 1,
      });
      expect(result.valid).toBe(false);
    });

    it("rejects endMin > 1440 (24 hours)", () => {
      const result = validateSlotTimes({
        dayOfWeek: 1,
        startMin: 540,
        endMin: 1500,
        durationMin: 60,
        capacity: 1,
      });
      expect(result.valid).toBe(false);
    });

    it("rejects capacity < 1", () => {
      const result = validateSlotTimes({
        dayOfWeek: 1,
        startMin: 540,
        endMin: 600,
        durationMin: 60,
        capacity: 0,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("capacity");
    });

    it("rejects durationMin < 1", () => {
      const result = validateSlotTimes({
        dayOfWeek: 1,
        startMin: 540,
        endMin: 600,
        durationMin: 0,
        capacity: 1,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("duration");
    });
  });

  describe("generateOccurrences", () => {
    it("generates occurrences for a weekly slot within a date range", () => {
      // Monday 9:00-10:00, looking at 2026-04-20 (Mon) to 2026-05-04 (Mon)
      const occurrences = generateOccurrences(
        {
          dayOfWeek: 1, // Monday
          startMin: 540, // 9:00
          endMin: 600, // 10:00
          timezone: "Asia/Tokyo",
        },
        new Date("2026-04-20T00:00:00+09:00"),
        new Date("2026-05-04T23:59:59+09:00"),
      );
      expect(occurrences.length).toBe(3); // Apr 20, Apr 27, May 4
    });

    it("returns empty when no matching days in range", () => {
      // Tuesday slot, but range is only Monday
      const occurrences = generateOccurrences(
        {
          dayOfWeek: 2, // Tuesday
          startMin: 540,
          endMin: 600,
          timezone: "Asia/Tokyo",
        },
        new Date("2026-04-20T00:00:00+09:00"), // Monday
        new Date("2026-04-20T23:59:59+09:00"), // Monday end
      );
      expect(occurrences.length).toBe(0);
    });

    it("each occurrence has correct startsAtIso and endsAtIso", () => {
      const occurrences = generateOccurrences(
        {
          dayOfWeek: 1,
          startMin: 540, // 9:00
          endMin: 600, // 10:00
          timezone: "Asia/Tokyo",
        },
        new Date("2026-04-20T00:00:00+09:00"),
        new Date("2026-04-20T23:59:59+09:00"),
      );
      expect(occurrences.length).toBe(1);
      // 9:00 JST = 00:00 UTC
      expect(occurrences[0].startsAtIso).toBe("2026-04-20T00:00:00.000Z");
      expect(occurrences[0].endsAtIso).toBe("2026-04-20T01:00:00.000Z");
    });
  });

  describe("isOccurrenceSkipped", () => {
    it("returns true when startsAtIso matches a skip", () => {
      const skips = [
        { startsAtIso: "2026-04-20T00:00:00.000Z" },
        { startsAtIso: "2026-04-27T00:00:00.000Z" },
      ];
      expect(isOccurrenceSkipped(skips, "2026-04-20T00:00:00.000Z")).toBe(true);
    });

    it("returns false when startsAtIso does not match any skip", () => {
      const skips = [{ startsAtIso: "2026-04-20T00:00:00.000Z" }];
      expect(isOccurrenceSkipped(skips, "2026-04-27T00:00:00.000Z")).toBe(
        false,
      );
    });

    it("returns false for empty skips array", () => {
      expect(isOccurrenceSkipped([], "2026-04-20T00:00:00.000Z")).toBe(false);
    });
  });

  describe("getCapacityDisplay", () => {
    it('returns "4/5 — 1 slot remaining" format', () => {
      const display = getCapacityDisplay(4, 5);
      expect(display.enrolled).toBe(4);
      expect(display.capacity).toBe(5);
      expect(display.remaining).toBe(1);
      expect(display.isFull).toBe(false);
      expect(display.label).toBe("4/5");
    });

    it("marks as full when enrolled equals capacity", () => {
      const display = getCapacityDisplay(5, 5);
      expect(display.remaining).toBe(0);
      expect(display.isFull).toBe(true);
      expect(display.label).toBe("5/5");
    });

    it("handles empty class", () => {
      const display = getCapacityDisplay(0, 3);
      expect(display.remaining).toBe(3);
      expect(display.isFull).toBe(false);
      expect(display.label).toBe("0/3");
    });

    it("handles private lesson (capacity 1)", () => {
      const display = getCapacityDisplay(0, 1);
      expect(display.remaining).toBe(1);
      expect(display.label).toBe("0/1");
    });
  });

  describe("findOccurrenceConflict", () => {
    const mondaySlot = {
      dayOfWeek: 1,
      startMin: 600,
      endMin: 660,
      timezone: "Asia/Tokyo",
      skips: [] as { startsAtIso: string }[],
    };

    it("returns null when there are no slots", () => {
      const result = findOccurrenceConflict(
        [],
        new Date("2026-05-04T00:00:00Z"),
        new Date("2026-05-04T23:59:59Z"),
      );
      expect(result).toBeNull();
    });

    it("returns the conflicting occurrence when window overlaps a slot", () => {
      const result = findOccurrenceConflict(
        [mondaySlot],
        new Date("2026-05-04T00:30:00Z"),
        new Date("2026-05-04T02:00:00Z"),
      );
      expect(result).not.toBeNull();
    });

    it("returns null when window does not overlap the slot", () => {
      const result = findOccurrenceConflict(
        [mondaySlot],
        new Date("2026-05-04T04:00:00Z"),
        new Date("2026-05-04T05:00:00Z"),
      );
      expect(result).toBeNull();
    });

    it("ignores skipped occurrences", () => {
      const skipped = {
        ...mondaySlot,
        skips: [{ startsAtIso: "2026-05-04T01:00:00.000Z" }],
      };
      const result = findOccurrenceConflict(
        [skipped],
        new Date("2026-05-04T00:30:00Z"),
        new Date("2026-05-04T02:00:00Z"),
      );
      expect(result).toBeNull();
    });
  });

  describe("planMaterializedBookings", () => {
    const slot = {
      id: "slot-1",
      dayOfWeek: 1,
      startMin: 600,
      endMin: 660,
      durationMin: 60,
      timezone: "Asia/Tokyo",
      skips: [] as { startsAtIso: string }[],
    };

    it("returns plans for all occurrences when none exist", () => {
      const plans = planMaterializedBookings(
        slot,
        [],
        new Date("2026-05-01T00:00:00Z"),
        new Date("2026-05-31T00:00:00Z"),
      );
      expect(plans.length).toBeGreaterThan(0);
      expect(plans.every((p) => p.scheduleSlotId === "slot-1")).toBe(true);
    });

    it("skips occurrences that already have bookings", () => {
      const all = planMaterializedBookings(
        slot,
        [],
        new Date("2026-05-01T00:00:00Z"),
        new Date("2026-05-31T00:00:00Z"),
      );
      const [first, ...rest] = all;
      const filtered = planMaterializedBookings(
        slot,
        [{ startsAtIso: first.startsAtIso }],
        new Date("2026-05-01T00:00:00Z"),
        new Date("2026-05-31T00:00:00Z"),
      );
      expect(filtered).toHaveLength(rest.length);
      expect(filtered.find((p) => p.startsAtIso === first.startsAtIso)).toBeUndefined();
    });

    it("honors the skip list", () => {
      const all = planMaterializedBookings(
        slot,
        [],
        new Date("2026-05-01T00:00:00Z"),
        new Date("2026-05-31T00:00:00Z"),
      );
      const skipIso = all[0].startsAtIso;
      const filtered = planMaterializedBookings(
        { ...slot, skips: [{ startsAtIso: skipIso }] },
        [],
        new Date("2026-05-01T00:00:00Z"),
        new Date("2026-05-31T00:00:00Z"),
      );
      expect(filtered.find((p) => p.startsAtIso === skipIso)).toBeUndefined();
    });
  });
});
