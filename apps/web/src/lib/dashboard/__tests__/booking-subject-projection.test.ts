import { expect, test, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { getStudentBookingsForDashboard } from "../student-bookings";
import { getTeacherBookingsForDashboard } from "../teacher-bookings";
import { conversationProduct, lessonSubjectCases } from "../../../../test/lesson-subject-fixture";

test.each(["student", "teacher"] as const)("the %s dashboard preserves mixed historical subjects and calendar-link names", async role => {
  const rows = lessonSubjectCases.map(({ learningLanguage }) => ({ id: learningLanguage, learningLanguage, lessonProduct: conversationProduct, status: "CONFIRMED", startsAt: new Date("2099-11-01T00:00:00Z"), endsAt: new Date("2099-11-01T01:00:00Z"), student: { id: "student", name: "Student" }, teacher: { user: { name: "Teacher" } } }));
  const db = { booking: { findMany: vi.fn().mockResolvedValue(rows) }, teacherProfile: { findUnique: vi.fn().mockResolvedValue({ userId: "teacher" }) }, teacherRosterEntry: { findMany: vi.fn().mockResolvedValue([]) } };
  const result = role === "student" ? await getStudentBookingsForDashboard(db as unknown as PrismaClient, "student") : await getTeacherBookingsForDashboard(db as unknown as PrismaClient, "teacher");
  for (const { learningLanguage, nameJa, nameEn } of lessonSubjectCases) {
    expect(result.bookings.find(row => row.id === learningLanguage)?.lessonProduct).toMatchObject({ id: conversationProduct.id, nameJa, nameEn });
    expect(result.scheduleItems.find(row => row.id === learningLanguage)?.title).toBe(`${nameJa} / ${nameEn}`);
  }
  expect(conversationProduct.nameJa).toBe("英会話");
});
