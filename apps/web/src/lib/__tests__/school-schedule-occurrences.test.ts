import { describe, expect, test } from "vitest";
import {
  expandSchoolSlotOccurrences,
  formatSchoolSlotLabel,
  resolveSchoolSlotTaxonomy,
} from "@/lib/school-schedule-occurrences";

const baseSlot = {
  id: "slot-1",
  dayOfWeek: 1, // Monday
  startMin: 540, // 09:00
  endMin: 600, // 10:00
  timezone: "Asia/Tokyo",
  capacity: 5,
  classLevel: { labelEn: "Year 7", labelJa: "中学1年" },
  classType: { labelEn: "Conversation", labelJa: "会話" },
};

describe("expandSchoolSlotOccurrences", () => {
  test("expands all active slots into SlotOption[] for the range", () => {
    const out = expandSchoolSlotOccurrences({
      slots: [baseSlot],
      rangeStart: new Date("2026-04-20T00:00:00+09:00"),
      rangeEnd: new Date("2026-05-04T23:59:59+09:00"),
      enrollmentBySlotId: { "slot-1": 2 },
      formatLabel: (s, occ) =>
        `${s.classLevel?.labelEn ?? ""} · ${s.classType?.labelEn ?? ""} (${occ.enrolled}/${occ.capacity})`,
    });
    expect(out).toHaveLength(3);
    expect(out[0].startsAtIso).toBe("2026-04-20T00:00:00.000Z");
    expect(out[0].endsAtIso).toBe("2026-04-20T01:00:00.000Z");
    expect(out[0].groupKey).toBe("slot-1");
    expect(out[0].label).toBe("Year 7 · Conversation (2/5)");
  });

  test("skips occurrences in the skip set", () => {
    const out = expandSchoolSlotOccurrences({
      slots: [
        { ...baseSlot, skips: ["2026-04-27T00:00:00.000Z"] },
      ],
      rangeStart: new Date("2026-04-20T00:00:00+09:00"),
      rangeEnd: new Date("2026-05-04T23:59:59+09:00"),
      enrollmentBySlotId: { "slot-1": 0 },
      formatLabel: (s) => s.classLevel?.labelEn ?? "",
    });
    expect(out).toHaveLength(2);
    expect(out.map((o) => o.startsAtIso)).toEqual([
      "2026-04-20T00:00:00.000Z",
      "2026-05-04T00:00:00.000Z",
    ]);
  });

  test("handles slots without taxonomy by leaving label fields empty", () => {
    const slot = {
      id: "slot-2",
      dayOfWeek: 1,
      startMin: 540,
      endMin: 600,
      timezone: "Asia/Tokyo",
      capacity: 1,
      classLevel: null,
      classType: null,
    };
    const out = expandSchoolSlotOccurrences({
      slots: [slot],
      rangeStart: new Date("2026-04-20T00:00:00+09:00"),
      rangeEnd: new Date("2026-04-20T23:59:59+09:00"),
      enrollmentBySlotId: { "slot-2": 0 },
      formatLabel: (s) =>
        `${s.classLevel?.labelEn ?? "-"}·${s.classType?.labelEn ?? "-"}`,
    });
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("-·-");
  });
});

describe("formatSchoolSlotLabel", () => {
  test("uses locale-specific labels when available (ja)", () => {
    const label = formatSchoolSlotLabel(baseSlot, { enrolled: 2, capacity: 5 }, "ja");
    expect(label).toContain("中学1年");
    expect(label).toContain("会話");
    expect(label).toContain("2/5");
  });

  test("uses english labels for en locale", () => {
    const label = formatSchoolSlotLabel(baseSlot, { enrolled: 2, capacity: 5 }, "en");
    expect(label).toContain("Year 7");
    expect(label).toContain("Conversation");
    expect(label).toContain("2/5");
  });

  test("falls back to labelEn when ja label is not set", () => {
    const slot = {
      ...baseSlot,
      classLevel: { labelEn: "X", labelJa: null },
      classType: { labelEn: "Y", labelJa: null },
    };
    const label = formatSchoolSlotLabel(slot, { enrolled: 0, capacity: 1 }, "ja");
    expect(label).toContain("X");
    expect(label).toContain("Y");
  });

  test("renders only the capacity when taxonomy is not set", () => {
    const slot = {
      ...baseSlot,
      classLevel: null,
      classType: null,
    };
    const label = formatSchoolSlotLabel(slot, { enrolled: 0, capacity: 1 }, "en");
    expect(label).toBe("0/1");
  });
});

describe("resolveSchoolSlotTaxonomy", () => {
  test("returns level and type as separate strings (en)", () => {
    const out = resolveSchoolSlotTaxonomy(baseSlot, "en");
    expect(out.level).toBe("Year 7");
    expect(out.type).toBe("Conversation");
  });

  test("uses japanese labels for ja locale", () => {
    const out = resolveSchoolSlotTaxonomy(baseSlot, "ja");
    expect(out.level).toBe("中学1年");
    expect(out.type).toBe("会話");
  });

  test("returns empty strings when taxonomy is not set", () => {
    const out = resolveSchoolSlotTaxonomy(
      {
        ...baseSlot,
        classLevel: null,
        classType: null,
      },
      "en",
    );
    expect(out.level).toBe("");
    expect(out.type).toBe("");
  });
});
