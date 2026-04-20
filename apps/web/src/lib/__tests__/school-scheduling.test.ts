import { describe, it, expect } from "vitest";
import {
  generateOccurrences,
  isOccurrenceSkipped,
  getCapacityDisplay,
  validateSlotTimes,
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
});
