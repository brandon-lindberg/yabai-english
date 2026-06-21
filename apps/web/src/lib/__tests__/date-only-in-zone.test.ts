import { describe, expect, test } from "vitest";
import { dateOnlyInZone, dateOnlyToUtcDateInZone } from "@/lib/date-only-in-zone";

describe("dateOnlyInZone", () => {
  test("formats local date bounds in the rule timezone instead of UTC", () => {
    expect(
      dateOnlyInZone(new Date("2026-07-04T15:00:00.000Z"), "Asia/Tokyo"),
    ).toBe("2026-07-05");
  });

  test("keeps UTC-midnight date-only rows on the same Tokyo date", () => {
    expect(
      dateOnlyInZone(new Date("2026-07-05T00:00:00.000Z"), "Asia/Tokyo"),
    ).toBe("2026-07-05");
  });

  test("stores a teacher-entered Tokyo date as Tokyo local midnight", () => {
    expect(
      dateOnlyToUtcDateInZone("2026-07-05", "Asia/Tokyo")?.toISOString(),
    ).toBe("2026-07-04T15:00:00.000Z");
  });

  test("stores a teacher-entered New York date as New York local midnight", () => {
    expect(
      dateOnlyToUtcDateInZone("2026-07-05", "America/New_York")?.toISOString(),
    ).toBe("2026-07-05T04:00:00.000Z");
  });
});
