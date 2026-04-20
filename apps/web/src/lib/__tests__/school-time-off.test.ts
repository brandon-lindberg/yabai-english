import { describe, it, expect } from "vitest";
import {
  validateTimeOffRequest,
  getAffectedSlotOccurrences,
  validateTimeOffReview,
} from "../school-time-off";

describe("school-time-off", () => {
  describe("validateTimeOffRequest", () => {
    it("accepts valid future date range", () => {
      const now = new Date("2026-04-20T10:00:00Z");
      const result = validateTimeOffRequest(
        {
          startDate: new Date("2026-04-25T00:00:00Z"),
          endDate: new Date("2026-04-27T23:59:59Z"),
        },
        now,
      );
      expect(result.valid).toBe(true);
    });

    it("rejects startDate in the past", () => {
      const now = new Date("2026-04-20T10:00:00Z");
      const result = validateTimeOffRequest(
        {
          startDate: new Date("2026-04-19T00:00:00Z"),
          endDate: new Date("2026-04-21T23:59:59Z"),
        },
        now,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("past");
    });

    it("rejects endDate before startDate", () => {
      const now = new Date("2026-04-20T10:00:00Z");
      const result = validateTimeOffRequest(
        {
          startDate: new Date("2026-04-27T00:00:00Z"),
          endDate: new Date("2026-04-25T23:59:59Z"),
        },
        now,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("before");
    });

    it("allows same-day request (startDate === endDate)", () => {
      const now = new Date("2026-04-20T10:00:00Z");
      const result = validateTimeOffRequest(
        {
          startDate: new Date("2026-04-25T00:00:00Z"),
          endDate: new Date("2026-04-25T23:59:59Z"),
        },
        now,
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("validateTimeOffReview", () => {
    it("allows PENDING → APPROVED", () => {
      const result = validateTimeOffReview("PENDING", "APPROVED");
      expect(result.valid).toBe(true);
    });

    it("allows PENDING → DENIED", () => {
      const result = validateTimeOffReview("PENDING", "DENIED");
      expect(result.valid).toBe(true);
    });

    it("rejects non-PENDING current status", () => {
      const result = validateTimeOffReview("APPROVED", "DENIED");
      expect(result.valid).toBe(false);
    });

    it("rejects transition to PENDING", () => {
      const result = validateTimeOffReview("PENDING", "PENDING");
      expect(result.valid).toBe(false);
    });
  });

  describe("getAffectedSlotOccurrences", () => {
    it("returns occurrences of a Monday slot within the time-off range", () => {
      const slot = {
        dayOfWeek: 1, // Monday
        startMin: 540, // 9:00
        endMin: 600, // 10:00
        timezone: "Asia/Tokyo",
      };
      // Time off from Apr 20 to May 3 (2 Mondays: Apr 20, Apr 27)
      const result = getAffectedSlotOccurrences(
        slot,
        new Date("2026-04-20T00:00:00+09:00"),
        new Date("2026-05-03T23:59:59+09:00"),
      );
      expect(result.length).toBe(2);
    });

    it("returns empty when no occurrences fall in range", () => {
      const slot = {
        dayOfWeek: 5, // Friday
        startMin: 540,
        endMin: 600,
        timezone: "Asia/Tokyo",
      };
      // Range is Monday to Wednesday
      const result = getAffectedSlotOccurrences(
        slot,
        new Date("2026-04-20T00:00:00+09:00"),
        new Date("2026-04-22T23:59:59+09:00"),
      );
      expect(result.length).toBe(0);
    });
  });
});
