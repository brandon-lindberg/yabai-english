import { describe, expect, test, vi } from "vitest";
import { syncTeacherRosterAfterStudentBooking } from "@/lib/sync-teacher-roster-after-student-booking";

describe("syncTeacherRosterAfterStudentBooking", () => {
  test("upserts active roster row and clears matching pending invite", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const findUnique = vi.fn().mockResolvedValue({ email: "Student@Example.com" });

    await syncTeacherRosterAfterStudentBooking(
      {
        teacherRosterEntry: { upsert, deleteMany },
        user: { findUnique },
      } as never,
      { teacherId: "tp-1", studentUserId: "stu-1" },
    );

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          teacherId_studentId: { teacherId: "tp-1", studentId: "stu-1" },
        },
        create: { teacherId: "tp-1", studentId: "stu-1" },
        update: {},
      }),
    );
    expect(deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teacherId: "tp-1",
          studentId: null,
          invitedEmail: { equals: "student@example.com", mode: "insensitive" },
        }),
      }),
    );
  });

  test("skips deleteMany when student has no email", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const findUnique = vi.fn().mockResolvedValue({ email: null });

    await syncTeacherRosterAfterStudentBooking(
      {
        teacherRosterEntry: { upsert, deleteMany },
        user: { findUnique },
      } as never,
      { teacherId: "tp-1", studentUserId: "stu-1" },
    );

    expect(upsert).toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
