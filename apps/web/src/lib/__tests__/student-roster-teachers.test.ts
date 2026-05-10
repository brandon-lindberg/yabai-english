import { describe, expect, test, vi } from "vitest";
import { getStudentRosterTeachers } from "../student-roster-teachers";

describe("getStudentRosterTeachers", () => {
  test("maps prisma rows to display names", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "r1",
        teacher: {
          id: "tp-1",
          displayName: "Coach",
          user: { name: "X" },
        },
      },
    ]);
    const rows = await getStudentRosterTeachers(
      { teacherRosterEntry: { findMany } } as never,
      "stu-1",
    );
    expect(rows).toEqual([
      {
        rosterEntryId: "r1",
        teacherProfileId: "tp-1",
        displayName: "Coach",
      },
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: "stu-1" },
      }),
    );
  });
});
