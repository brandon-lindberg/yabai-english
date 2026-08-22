import { describe, expect, test } from "vitest";
import {
  sortStudentCompletedBookings,
  sortTeacherCompletedBookings,
} from "@/lib/dashboard/sort-completed-bookings";

function row(student: { name: string | null; email: string | null }, startsAt: string, id: string) {
  return {
    id,
    startsAt: new Date(startsAt),
    student,
  };
}

describe("sortTeacherCompletedBookings", () => {
  test("puts the most recently taught student first, not the alphabetically first", () => {
    // Was `localeCompare` on the name, so a student last seen a year ago sat
    // above one taught yesterday. On a full-time roster that buries the people
    // you are actually teaching.
    const sorted = sortTeacherCompletedBookings([
      row({ name: "Alice", email: null }, "2026-01-10T10:00:00.000Z", "a1"),
      row({ name: "Charlie", email: null }, "2026-08-16T10:00:00.000Z", "c1"),
      row({ name: "Bob", email: null }, "2026-04-05T10:00:00.000Z", "b1"),
    ]);
    expect(sorted.map((r) => r.id)).toEqual(["c1", "b1", "a1"]);
  });

  test("keeps each student's lessons together, newest first", () => {
    const sorted = sortTeacherCompletedBookings([
      row({ name: "Alice", email: null }, "2026-01-10T10:00:00.000Z", "a-old"),
      row({ name: "Charlie", email: null }, "2026-08-01T10:00:00.000Z", "c-old"),
      row({ name: "Alice", email: null }, "2026-02-10T10:00:00.000Z", "a-new"),
      row({ name: "Charlie", email: null }, "2026-08-16T10:00:00.000Z", "c-new"),
    ]);
    // Charlie leads on recency, and neither student's run is broken up.
    expect(sorted.map((r) => r.id)).toEqual(["c-new", "c-old", "a-new", "a-old"]);
  });

  test("orders by each student's own most recent lesson, not by any single row", () => {
    // Alice has more lessons, but Charlie was taught more recently.
    const sorted = sortTeacherCompletedBookings([
      row({ name: "Alice", email: null }, "2026-05-01T10:00:00.000Z", "a1"),
      row({ name: "Alice", email: null }, "2026-05-02T10:00:00.000Z", "a2"),
      row({ name: "Alice", email: null }, "2026-05-03T10:00:00.000Z", "a3"),
      row({ name: "Charlie", email: null }, "2026-06-01T10:00:00.000Z", "c1"),
    ]);
    expect(sorted[0].id).toBe("c1");
  });

  test("falls back to email when a student has no name", () => {
    const sorted = sortTeacherCompletedBookings([
      row({ name: null, email: "alpha@x.test" }, "2026-04-01T10:00:00.000Z", "a"),
      row({ name: null, email: "zebra@x.test" }, "2026-04-02T10:00:00.000Z", "z"),
    ]);
    expect(sorted.map((r) => r.id)).toEqual(["z", "a"]);
  });

  test("breaks ties between counterparts by name, so the order is stable", () => {
    const sameMoment = "2026-04-02T10:00:00.000Z";
    const sorted = sortTeacherCompletedBookings([
      row({ name: "Zoe", email: null }, sameMoment, "z"),
      row({ name: "Adam", email: null }, sameMoment, "a"),
    ]);
    expect(sorted.map((r) => r.id)).toEqual(["a", "z"]);
  });

  test("does not mutate the array it is given", () => {
    const input = [
      row({ name: "Alice", email: null }, "2026-01-10T10:00:00.000Z", "a1"),
      row({ name: "Charlie", email: null }, "2026-08-16T10:00:00.000Z", "c1"),
    ];
    sortTeacherCompletedBookings(input);
    expect(input.map((r) => r.id)).toEqual(["a1", "c1"]);
  });
});

describe("sortStudentCompletedBookings", () => {
  test("puts the most recently seen teacher first", () => {
    // The student side shares the same ordering, and had the same problem.
    const teacherRow = (name: string, startsAt: string, id: string) => ({
      id,
      startsAt: new Date(startsAt),
      teacher: { user: { name, email: null } },
    });

    const sorted = sortStudentCompletedBookings([
      teacherRow("Alice", "2026-01-10T10:00:00.000Z", "a1"),
      teacherRow("Charlie", "2026-08-16T10:00:00.000Z", "c1"),
    ]);
    expect(sorted.map((r) => r.id)).toEqual(["c1", "a1"]);
  });
});
