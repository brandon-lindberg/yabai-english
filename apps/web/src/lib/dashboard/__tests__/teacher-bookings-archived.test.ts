import { describe, expect, test, vi } from "vitest";
import { getTeacherBookingsForDashboard } from "@/lib/dashboard/teacher-bookings";
import type { PrismaClient } from "@/generated/prisma/client";

/*
  Archiving a student tidies the lesson history. It must never hide a lesson
  the teacher has still to teach: a teacher who archives someone with a booked
  lesson would simply stop seeing it and miss it. So the filter belongs on the
  completed history alone, not on the query that also feeds the upcoming list
  and the calendar.
*/
function prismaStub(bookings: unknown[], archivedStudentIds: string[]) {
  return {
    teacherProfile: { findUnique: vi.fn().mockResolvedValue({ userId: "tu-1" }) },
    booking: { findMany: vi.fn().mockResolvedValue(bookings) },
    teacherRosterEntry: {
      findMany: vi.fn().mockResolvedValue(archivedStudentIds.map((studentId) => ({ studentId }))),
    },
  } as unknown as PrismaClient;
}

const lesson = (id: string, studentId: string, startsAt: Date) => ({
  id,
  studentId,
  startsAt,
  endsAt: new Date(startsAt.getTime() + 3_600_000),
  status: "COMPLETED",
  lessonProduct: { nameJa: "初級", nameEn: "Beginner" },
  student: { name: `Student ${studentId}`, email: null, studentProfile: { learningGoals: [] } },
  invoice: null,
});

describe("getTeacherBookingsForDashboard with archived students", () => {
  test("hides an archived student's completed lessons", async () => {
    const past = new Date(Date.now() - 86_400_000);
    const prisma = prismaStub(
      [lesson("b-active", "s-active", past), lesson("b-archived", "s-archived", past)],
      ["s-archived"],
    );

    const { completed } = await getTeacherBookingsForDashboard(prisma, "tp-1");

    expect(completed.map((b) => b.id)).toEqual(["b-active"]);
  });

  test("still shows an archived student's upcoming lesson", async () => {
    const future = new Date(Date.now() + 86_400_000);
    const prisma = prismaStub([lesson("b-future", "s-archived", future)], ["s-archived"]);

    const { upcoming, scheduleItems } = await getTeacherBookingsForDashboard(prisma, "tp-1");

    expect(upcoming.map((b) => b.id)).toEqual(["b-future"]);
    expect(scheduleItems).toHaveLength(1);
  });

  test("only asks for archived entries, not the whole roster", async () => {
    const prisma = prismaStub([], []);

    await getTeacherBookingsForDashboard(prisma, "tp-1");

    const args = (prisma.teacherRosterEntry.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(args.where).toMatchObject({ teacherId: "tp-1", archivedAt: { not: null } });
  });
});
