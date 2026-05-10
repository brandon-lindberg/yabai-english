import { beforeEach, describe, expect, test, vi } from "vitest";

const syncMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/sync-teacher-roster-after-student-booking", () => ({
  syncTeacherRosterAfterStudentBooking: (...args: unknown[]) => syncMock(...args),
}));

import { reconcileTeacherRosterFromBookings } from "@/lib/reconcile-teacher-roster-from-bookings";

describe("reconcileTeacherRosterFromBookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("syncs once per distinct teacher for the student", async () => {
    const findMany = vi.fn().mockResolvedValue([{ teacherId: "tp-1" }, { teacherId: "tp-2" }]);
    const prisma = { booking: { findMany }, teacherRosterEntry: {}, user: {} } as never;

    await reconcileTeacherRosterFromBookings(prisma, { studentUserId: "stu-1" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ studentId: "stu-1" }),
        distinct: ["teacherId"],
      }),
    );
    expect(syncMock).toHaveBeenCalledTimes(2);
    expect(syncMock).toHaveBeenNthCalledWith(1, prisma, {
      teacherId: "tp-1",
      studentUserId: "stu-1",
    });
    expect(syncMock).toHaveBeenNthCalledWith(2, prisma, {
      teacherId: "tp-2",
      studentUserId: "stu-1",
    });
  });

  test("syncs once per distinct student for the teacher profile", async () => {
    const findMany = vi.fn().mockResolvedValue([{ studentId: "s-a" }, { studentId: "s-b" }]);
    const prisma = { booking: { findMany }, teacherRosterEntry: {}, user: {} } as never;

    await reconcileTeacherRosterFromBookings(prisma, { teacherProfileId: "tp-9" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ teacherId: "tp-9" }),
        distinct: ["studentId"],
      }),
    );
    expect(syncMock).toHaveBeenCalledTimes(2);
    expect(syncMock).toHaveBeenNthCalledWith(1, prisma, {
      teacherId: "tp-9",
      studentUserId: "s-a",
    });
  });
});
