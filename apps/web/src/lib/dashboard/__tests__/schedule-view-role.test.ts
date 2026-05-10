import { describe, expect, test } from "vitest";
import { Role } from "@/generated/prisma/client";
import { shouldLoadTeacherBookingsOnSchedule } from "@/lib/dashboard/schedule-view-role";

describe("shouldLoadTeacherBookingsOnSchedule", () => {
  test("true for TEACHER", () => {
    expect(shouldLoadTeacherBookingsOnSchedule(Role.TEACHER)).toBe(true);
  });

  test("true for SUPER_ADMIN (matches dashboard teacher stats)", () => {
    expect(shouldLoadTeacherBookingsOnSchedule(Role.SUPER_ADMIN)).toBe(true);
  });

  test("false for STUDENT", () => {
    expect(shouldLoadTeacherBookingsOnSchedule(Role.STUDENT)).toBe(false);
  });
});
