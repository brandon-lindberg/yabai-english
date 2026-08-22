import { describe, expect, test } from "vitest";
import { excludeArchivedStudents } from "@/lib/dashboard/exclude-archived-students";

const booking = (id: string, studentId: string) => ({ id, studentId });

describe("excludeArchivedStudents", () => {
  test("drops lessons belonging to an archived student", () => {
    const kept = excludeArchivedStudents(
      [booking("b1", "s-active"), booking("b2", "s-archived")],
      new Set(["s-archived"]),
    );

    expect(kept.map((b) => b.id)).toEqual(["b1"]);
  });

  test("keeps everything when nobody is archived", () => {
    const rows = [booking("b1", "s1"), booking("b2", "s2")];

    expect(excludeArchivedStudents(rows, new Set())).toEqual(rows);
  });

  test("does not mutate the list it is given", () => {
    const rows = [booking("b1", "s-archived"), booking("b2", "s2")];
    excludeArchivedStudents(rows, new Set(["s-archived"]));

    expect(rows).toHaveLength(2);
  });
});
