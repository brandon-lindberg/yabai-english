import { describe, expect, test } from "vitest";
import { canBypassLeadTimeWindow } from "@/lib/lead-time-policy";

describe("canBypassLeadTimeWindow", () => {
  test("never allows student bypass", () => {
    expect(canBypassLeadTimeWindow("STUDENT", true)).toBe(false);
  });

  test("allows teacher/admin bypass only with explicit manual override", () => {
    expect(canBypassLeadTimeWindow("TEACHER", false)).toBe(false);
    expect(canBypassLeadTimeWindow("ADMIN", false)).toBe(false);
    expect(canBypassLeadTimeWindow("TEACHER", true)).toBe(true);
    expect(canBypassLeadTimeWindow("ADMIN", true)).toBe(true);
  });
});
