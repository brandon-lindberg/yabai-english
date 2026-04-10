import { describe, expect, test } from "vitest";
import { isBookingOutsideLeadWindow } from "@/lib/lead-time-policy";

describe("isBookingOutsideLeadWindow", () => {
  test("allows booking exactly 48 hours ahead", () => {
    const now = new Date("2026-04-10T00:00:00.000Z");
    const start = new Date("2026-04-12T00:00:00.000Z");
    expect(isBookingOutsideLeadWindow({ start, now, minimumHours: 48 })).toBe(true);
  });

  test("rejects booking under 48 hours", () => {
    const now = new Date("2026-04-10T00:00:00.000Z");
    const start = new Date("2026-04-11T23:59:00.000Z");
    expect(isBookingOutsideLeadWindow({ start, now, minimumHours: 48 })).toBe(false);
  });
});
