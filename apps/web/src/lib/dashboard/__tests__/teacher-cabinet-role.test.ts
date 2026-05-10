import { describe, expect, test } from "vitest";
import { Role } from "@/generated/prisma/client";
import { isTeacherCabinetRole } from "../teacher-cabinet-role";

describe("isTeacherCabinetRole", () => {
  test("allows TEACHER and SUPER_ADMIN", () => {
    expect(isTeacherCabinetRole(Role.TEACHER)).toBe(true);
    expect(isTeacherCabinetRole(Role.SUPER_ADMIN)).toBe(true);
  });

  test("rejects other roles", () => {
    expect(isTeacherCabinetRole(Role.STUDENT)).toBe(false);
    expect(isTeacherCabinetRole(undefined)).toBe(false);
  });
});
