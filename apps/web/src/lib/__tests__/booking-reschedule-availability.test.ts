import { expect, test } from "vitest";
import { studentRescheduleSlots } from "../booking-reschedule-availability";
const now = new Date("2026-11-02T00:00:00Z");
const slot = { id: "slot", dayOfWeek: 4, startMin: 660, endMin: 720, timezone: "Asia/Tokyo", recurrence: "ONE_OFF" as const,
  startsOn: new Date("2026-11-05T00:00:00Z"), endsOn: new Date("2026-11-05T00:00:00Z"), classLevelId: null, classTypeId: null,
  assignedStudentId: null, teacherLessonOffering: { id: "offer", active: true, learningLanguage: "JAPANESE" as const, isGroup: false, groupSize: null },
};
const base = { booking: { id: "booking", studentId: "student", status: "CONFIRMED" as const, startsAt: new Date("2026-11-04T02:00:00Z"),
  rescheduleCount: 0, groupLessonSessionId: null, learningLanguage: "JAPANESE" as const, lessonProduct: { durationMin: 60 } },
  slots: [slot], skipped: [], blocking: [], schoolSlots: [], viewerTimezone: "Asia/Tokyo", now,
};
test("shows only real future alternatives from published matching private availability", () => {
  expect(studentRescheduleSlots(base).map(row => row.startsAtIso)).toEqual(["2026-11-05T02:00:00.000Z"]);
});
test.each([
  { slots: [] }, { slots: [{ ...slot, assignedStudentId: "other-student" }] },
  { slots: [{ ...slot, teacherLessonOffering: { ...slot.teacherLessonOffering, learningLanguage: "ENGLISH" as const } }] },
  { slots: [{ ...slot, teacherLessonOffering: { ...slot.teacherLessonOffering, active: false } }] },
  { slots: [{ ...slot, teacherLessonOffering: { ...slot.teacherLessonOffering, isGroup: true } }] },
  { slots: [{ ...slot, endMin: 690 }] },
  { skipped: [{ slotId: "slot", startsAtIso: "2026-11-05T02:00:00.000Z" }] },
  { blocking: [{ startsAtIso: "2026-11-05T02:30:00.000Z", endsAtIso: "2026-11-05T03:30:00.000Z" }] },
  { now: new Date("2026-11-05T00:00:00Z") },
  { booking: { ...base.booking, rescheduleCount: 1 } },
  { booking: { ...base.booking, status: "CANCELLED" as const } },
  { booking: { ...base.booking, startsAt: new Date("2026-11-05T02:00:00Z") } },
])("hides rescheduling when no eligible available alternative remains (%j)", overrides => {
  expect(studentRescheduleSlots({ ...base, ...overrides })).toEqual([]);
});
