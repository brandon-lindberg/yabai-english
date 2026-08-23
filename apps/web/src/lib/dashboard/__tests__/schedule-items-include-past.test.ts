import { describe, expect, test, vi } from "vitest";
import { getTeacherBookingsForDashboard } from "@/lib/dashboard/teacher-bookings";
import { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";
import type { PrismaClient } from "@/generated/prisma/client";

/*
  The schedule calendar is a record as well as a plan. It used to be built from
  `upcoming` alone, so the moment a lesson ended it vanished from the grid for
  both roles and the month you actually studied read as empty.
*/

const PAST = new Date(Date.now() - 86_400_000);
const FUTURE = new Date(Date.now() + 86_400_000);

const lessonProduct = { nameJa: "初級", nameEn: "Beginner" };

function teacherLesson(id: string, startsAt: Date, status = "COMPLETED") {
  return {
    id,
    studentId: "s-1",
    startsAt,
    endsAt: new Date(startsAt.getTime() + 3_600_000),
    status,
    lessonProduct,
    student: { name: "Student One", email: null, studentProfile: { learningGoals: [] } },
    invoice: null,
  };
}

function studentLesson(id: string, startsAt: Date, status = "COMPLETED") {
  return {
    id,
    startsAt,
    endsAt: new Date(startsAt.getTime() + 3_600_000),
    status,
    lessonProduct,
    teacher: { user: { name: "Teacher One", email: null } },
    invoice: null,
  };
}

function teacherPrisma(bookings: unknown[], archivedStudentIds: string[] = []) {
  return {
    teacherProfile: { findUnique: vi.fn().mockResolvedValue({ userId: "tu-1" }) },
    booking: { findMany: vi.fn().mockResolvedValue(bookings) },
    teacherRosterEntry: {
      findMany: vi.fn().mockResolvedValue(archivedStudentIds.map((studentId) => ({ studentId }))),
    },
  } as unknown as PrismaClient;
}

function studentPrisma(bookings: unknown[]) {
  return { booking: { findMany: vi.fn().mockResolvedValue(bookings) } } as unknown as PrismaClient;
}

describe("schedule calendar items", () => {
  test("a teacher sees the lessons they have taught", async () => {
    const prisma = teacherPrisma([teacherLesson("b-past", PAST), teacherLesson("b-next", FUTURE, "CONFIRMED")]);

    const { scheduleItems } = await getTeacherBookingsForDashboard(prisma, "tp-1");

    expect(scheduleItems.map((i) => [i.id, i.isPast])).toEqual([
      ["b-next", false],
      ["b-past", true],
    ]);
  });

  test("a student sees the lessons they have taken", async () => {
    const prisma = studentPrisma([studentLesson("b-past", PAST), studentLesson("b-next", FUTURE, "CONFIRMED")]);

    const { scheduleItems } = await getStudentBookingsForDashboard(prisma, "u-1");

    expect(scheduleItems.map((i) => [i.id, i.isPast])).toEqual([
      ["b-next", false],
      ["b-past", true],
    ]);
  });

  test("cancelled lessons stay off the calendar", async () => {
    const prisma = studentPrisma([studentLesson("b-cancelled", PAST, "CANCELLED")]);

    const { scheduleItems } = await getStudentBookingsForDashboard(prisma, "u-1");

    expect(scheduleItems).toEqual([]);
  });

  test("upcoming items lead, so the calendar can anchor on the next lesson", async () => {
    // The component opens on the first non-past item; a past-first ordering
    // would put every teacher in their oldest lesson on load.
    const prisma = teacherPrisma([
      teacherLesson("b-old", new Date(Date.now() - 30 * 86_400_000)),
      teacherLesson("b-next", FUTURE, "CONFIRMED"),
    ]);

    const { scheduleItems } = await getTeacherBookingsForDashboard(prisma, "tp-1");

    expect(scheduleItems[0].isPast).toBe(false);
  });

  test("an archived student's past lessons leave the calendar with the history", async () => {
    // Archiving hides that student's history; leaving their lessons on the grid
    // would resurrect on one surface exactly what was tidied away on the other.
    const prisma = teacherPrisma([teacherLesson("b-archived", PAST)], ["s-1"]);

    const { scheduleItems } = await getTeacherBookingsForDashboard(prisma, "tp-1");

    expect(scheduleItems).toEqual([]);
  });

  test("an archived student's upcoming lesson still shows", async () => {
    const prisma = teacherPrisma([teacherLesson("b-future", FUTURE, "CONFIRMED")], ["s-1"]);

    const { scheduleItems } = await getTeacherBookingsForDashboard(prisma, "tp-1");

    expect(scheduleItems.map((i) => i.id)).toEqual(["b-future"]);
  });
});
