import { describe, expect, test } from "vitest";
import { buildTeacherScheduleItems } from "@/lib/dashboard/teacher-bookings";
import { normalizeAvailabilitySlotsInput } from "@/lib/teacher-availability";

describe("teacher dashboard helpers", () => {
  test("buildTeacherScheduleItems maps student names for calendar cards", () => {
    const items = buildTeacherScheduleItems([
      {
        id: "b1",
        startsAt: new Date("2026-04-20T09:00:00.000Z"),
        endsAt: new Date("2026-04-20T09:20:00.000Z"),
        lessonProduct: { nameJa: "無料体験", nameEn: "Free trial" },
        student: { name: "Aiko", email: "aiko@example.com" },
      },
      {
        id: "b2",
        startsAt: new Date("2026-04-20T10:00:00.000Z"),
        endsAt: new Date("2026-04-20T10:50:00.000Z"),
        lessonProduct: { nameJa: "通常", nameEn: "Standard" },
        student: { name: null, email: "fallback@example.com" },
      },
    ]);

    expect(items).toEqual([
      {
        id: "b1",
        startsAtIso: "2026-04-20T09:00:00.000Z",
        endsAtIso: "2026-04-20T09:20:00.000Z",
        title: "無料体験 / Free trial",
        teacherName: "Aiko",
      },
      {
        id: "b2",
        startsAtIso: "2026-04-20T10:00:00.000Z",
        endsAtIso: "2026-04-20T10:50:00.000Z",
        title: "通常 / Standard",
        teacherName: "fallback@example.com",
      },
    ]);
  });

  test("normalizeAvailabilitySlotsInput rejects invalid ranges", () => {
    const parsed = normalizeAvailabilitySlotsInput([
      {
        dayOfWeek: 1,
        startMin: 600,
        endMin: 540,
        timezone: "Asia/Tokyo",
        lessonLevel: "intermediate",
        lessonType: "conversation",
      },
    ]);

    expect(parsed.success).toBe(false);
  });
});
