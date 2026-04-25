import { describe, expect, test } from "vitest";
import {
  expandSchoolSlotOccurrences,
  formatSchoolSlotLabel,
} from "@/lib/school-schedule-occurrences";

const baseSlot = {
  id: "slot-1",
  dayOfWeek: 1, // Monday
  startMin: 540, // 09:00
  endMin: 600, // 10:00
  timezone: "Asia/Tokyo",
  capacity: 5,
  classLevel: { label: "Year 7", labelJa: "中学1年", labelEn: "Year 7" },
  classType: { label: "Conversation", labelJa: "会話", labelEn: "Conversation" },
};

describe("expandSchoolSlotOccurrences", () => {
  test("expands all active slots into SlotOption[] for the range", () => {
    const out = expandSchoolSlotOccurrences({
      slots: [baseSlot],
      rangeStart: new Date("2026-04-20T00:00:00+09:00"),
      rangeEnd: new Date("2026-05-04T23:59:59+09:00"),
      enrollmentBySlotId: { "slot-1": 2 },
      formatLabel: (s, occ) =>
        `${s.classLevel?.label ?? ""} · ${s.classType?.label ?? ""} (${occ.enrolled}/${occ.capacity})`,
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
      formatLabel: (s) => s.classLevel?.label ?? "",
    });
    expect(out).toHaveLength(2);
    expect(out.map((o) => o.startsAtIso)).toEqual([
      "2026-04-20T00:00:00.000Z",
      "2026-05-04T00:00:00.000Z",
    ]);
  });

  test("handles slots without taxonomy by falling back to legacy lessonLevel/lessonType", () => {
    const slot = {
      id: "slot-2",
      dayOfWeek: 1,
      startMin: 540,
      endMin: 600,
      timezone: "Asia/Tokyo",
      capacity: 1,
      lessonLevel: "beginner",
      lessonType: "conversation",
      classLevel: null,
      classType: null,
    };
    const out = expandSchoolSlotOccurrences({
      slots: [slot],
      rangeStart: new Date("2026-04-20T00:00:00+09:00"),
      rangeEnd: new Date("2026-04-20T23:59:59+09:00"),
      enrollmentBySlotId: { "slot-2": 0 },
      formatLabel: (s) => `${s.lessonLevel ?? ""}·${s.lessonType ?? ""}`,
    });
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("beginner·conversation");
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

  test("falls back to label when locale label missing", () => {
    const slot = {
      ...baseSlot,
      classLevel: { label: "X", labelJa: null, labelEn: null },
      classType: { label: "Y", labelJa: null, labelEn: null },
    };
    const label = formatSchoolSlotLabel(slot, { enrolled: 0, capacity: 1 }, "ja");
    expect(label).toContain("X");
    expect(label).toContain("Y");
  });

  test("falls back to lessonLevel/lessonType strings when no taxonomy", () => {
    const slot = {
      ...baseSlot,
      classLevel: null,
      classType: null,
      lessonLevel: "intermediate",
      lessonType: "grammar",
    };
    const label = formatSchoolSlotLabel(slot, { enrolled: 0, capacity: 1 }, "en");
    expect(label).toContain("intermediate");
    expect(label).toContain("grammar");
  });
});
