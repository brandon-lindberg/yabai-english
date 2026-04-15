import { describe, expect, test } from "vitest";
import { sortTeacherCompletedBookings } from "@/lib/dashboard/sort-teacher-completed-bookings";

function row(student: { name: string | null; email: string | null }, startsAt: string, id: string) {
  return {
    id,
    startsAt: new Date(startsAt),
    student,
  };
}

describe("sortTeacherCompletedBookings", () => {
  test("sorts by student name then newest date first", () => {
    const sorted = sortTeacherCompletedBookings([
      row({ name: "Charlie", email: null }, "2026-04-01T10:00:00.000Z", "c1"),
      row({ name: "Alice", email: null }, "2026-04-10T10:00:00.000Z", "a2"),
      row({ name: "Alice", email: null }, "2026-04-12T10:00:00.000Z", "a1"),
      row({ name: "Bob", email: null }, "2026-04-05T10:00:00.000Z", "b1"),
    ]);
    expect(sorted.map((r) => r.id)).toEqual(["a1", "a2", "b1", "c1"]);
  });

  test("uses email when name is missing for ordering", () => {
    const sorted = sortTeacherCompletedBookings([
      row({ name: null, email: "zebra@x.test" }, "2026-04-01T10:00:00.000Z", "z"),
      row({ name: null, email: "alpha@x.test" }, "2026-04-02T10:00:00.000Z", "a"),
    ]);
    expect(sorted.map((r) => r.id)).toEqual(["a", "z"]);
  });
});
