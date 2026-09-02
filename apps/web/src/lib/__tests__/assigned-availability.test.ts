import { describe, expect, test } from "vitest";
import {
  visibleAvailabilityWhere,
  visibleAvailabilitySlots,
  isAvailabilitySlotVisibleTo,
} from "@/lib/assigned-availability";

const open = { id: "open", assignedStudentId: null };
const kanas = { id: "kanas", assignedStudentId: "student-kana" };
const dwights = { id: "dwights", assignedStudentId: "student-dwight" };

describe("isAvailabilitySlotVisibleTo", () => {
  test("an unassigned slot is visible to anyone, signed in or not", () => {
    expect(isAvailabilitySlotVisibleTo(open, "student-kana")).toBe(true);
    expect(isAvailabilitySlotVisibleTo(open, null)).toBe(true);
  });

  test("an assigned slot is visible to the student it is reserved for", () => {
    expect(isAvailabilitySlotVisibleTo(kanas, "student-kana")).toBe(true);
  });

  test("an assigned slot is invisible to every other student", () => {
    expect(isAvailabilitySlotVisibleTo(kanas, "student-dwight")).toBe(false);
  });

  test("an assigned slot is invisible to a signed-out visitor", () => {
    expect(isAvailabilitySlotVisibleTo(kanas, null)).toBe(false);
  });
});

describe("visibleAvailabilitySlots", () => {
  test("keeps a student's own reserved time and drops other students'", () => {
    const visible = visibleAvailabilitySlots([open, kanas, dwights], "student-kana");
    // Not "shown as taken" — absent. These lessons are private, so another
    // student must not learn that the time is spoken for.
    expect(visible.map((s) => s.id)).toEqual(["open", "kanas"]);
  });

  test("a signed-out visitor sees only open slots", () => {
    expect(
      visibleAvailabilitySlots([open, kanas, dwights], null).map((s) => s.id),
    ).toEqual(["open"]);
  });
});

describe("visibleAvailabilityWhere", () => {
  test("a student sees open slots and their own reserved ones", () => {
    expect(visibleAvailabilityWhere("student-kana")).toEqual({
      OR: [{ assignedStudentId: null }, { assignedStudentId: "student-kana" }],
    });
  });

  test("everyone else sees only open slots", () => {
    expect(visibleAvailabilityWhere(null)).toEqual({ assignedStudentId: null });
  });
});
