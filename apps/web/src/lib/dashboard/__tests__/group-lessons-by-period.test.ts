import { describe, expect, test } from "vitest";
import { groupLessonsByYearAndMonth } from "@/lib/dashboard/group-lessons-by-period";

const at = (iso: string, id: string) => ({ id, startsAtIso: iso });
const group = (rows: { id: string; startsAtIso: string }[], tz?: string) =>
  groupLessonsByYearAndMonth(rows, (r) => r.startsAtIso, "en-US", tz);

describe("groupLessonsByYearAndMonth", () => {
  test("splits a run into years, then months inside each", () => {
    const years = group([
      at("2026-08-16T01:30:00.000Z", "aug-16"),
      at("2026-08-09T01:30:00.000Z", "aug-9"),
      at("2026-07-26T01:30:00.000Z", "jul-26"),
      at("2025-12-01T01:30:00.000Z", "dec-1"),
    ], "UTC");

    expect(years.map((y) => y.label)).toEqual(["2026", "2025"]);
    expect(years[0].months.map((m) => m.label)).toEqual(["August 2026", "July 2026"]);
    expect(years[0].months[0].items.map((i) => i.id)).toEqual(["aug-16", "aug-9"]);
    expect(years[1].months.map((m) => m.label)).toEqual(["December 2025"]);
  });

  test("counts every lesson in the year, across its months", () => {
    const years = group([
      at("2026-08-16T01:30:00.000Z", "a"),
      at("2026-07-26T01:30:00.000Z", "b"),
      at("2026-07-05T01:30:00.000Z", "c"),
    ], "UTC");

    expect(years[0].count).toBe(3);
    expect(years[0].months.map((m) => m.items.length)).toEqual([1, 2]);
  });

  test("preserves the order it was given rather than re-sorting", () => {
    // The caller has already ordered these newest-first; re-sorting here would
    // silently override a deliberate arrangement, exactly as groupConsecutive
    // is careful not to.
    const years = group([
      at("2026-07-05T01:30:00.000Z", "older-first"),
      at("2026-07-26T01:30:00.000Z", "newer-second"),
    ], "UTC");

    expect(years[0].months[0].items.map((i) => i.id)).toEqual(["older-first", "newer-second"]);
  });

  test("buckets by the date the viewer actually sees, not by UTC", () => {
    // 2026-08-01T00:30Z is 09:30 on Aug 1 in Tokyo but still 20:30 on Jul 31
    // in New York. The row's visible date and its month heading must agree.
    const iso = "2026-08-01T00:30:00.000Z";

    expect(group([at(iso, "x")], "Asia/Tokyo")[0].months[0].label).toBe("August 2026");
    expect(group([at(iso, "x")], "America/New_York")[0].months[0].label).toBe("July 2026");
  });

  test("keys are locale-independent, so switching language keeps collapse state", () => {
    const rows = [at("2026-08-16T01:30:00.000Z", "a")];
    const english = groupLessonsByYearAndMonth(rows, (r) => r.startsAtIso, "en-US", "UTC");
    const japanese = groupLessonsByYearAndMonth(rows, (r) => r.startsAtIso, "ja-JP", "UTC");

    expect(english[0].key).toBe(japanese[0].key);
    expect(english[0].months[0].key).toBe(japanese[0].months[0].key);
    // The label is localised even though the key is not.
    expect(english[0].months[0].label).not.toBe(japanese[0].months[0].label);
    expect(english[0].months[0].key).toContain("2026");
  });

  test("returns nothing for an empty list", () => {
    expect(group([], "UTC")).toEqual([]);
  });

  test("keeps two separate runs of the same month apart", () => {
    // Defensive: consecutive-run semantics, matching groupConsecutive.
    const years = group([
      at("2026-08-16T01:30:00.000Z", "a"),
      at("2026-07-26T01:30:00.000Z", "b"),
      at("2026-08-02T01:30:00.000Z", "c"),
    ], "UTC");

    expect(years[0].months.map((m) => m.label)).toEqual(["August 2026", "July 2026", "August 2026"]);
    // Two runs of the same month must not collide as React keys.
    const keys = years[0].months.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
