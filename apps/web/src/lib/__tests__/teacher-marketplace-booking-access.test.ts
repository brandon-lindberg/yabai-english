import { describe, expect, test } from "vitest";
import { studentMayAccessTeacherBookingFlow } from "../teacher-marketplace-booking-access";

describe("studentMayAccessTeacherBookingFlow", () => {
  test("public teacher: allows guests and any student", () => {
    expect(
      studentMayAccessTeacherBookingFlow({
        marketplaceHidden: false,
        viewerStudentId: null,
        isStudentOnRoster: false,
      }),
    ).toBe(true);
    expect(
      studentMayAccessTeacherBookingFlow({
        marketplaceHidden: false,
        viewerStudentId: "stu-1",
        isStudentOnRoster: false,
      }),
    ).toBe(true);
  });

  test("private teacher: rejects guests", () => {
    expect(
      studentMayAccessTeacherBookingFlow({
        marketplaceHidden: true,
        viewerStudentId: null,
        isStudentOnRoster: false,
      }),
    ).toBe(false);
  });

  test("private teacher: rejects student not on roster", () => {
    expect(
      studentMayAccessTeacherBookingFlow({
        marketplaceHidden: true,
        viewerStudentId: "stu-1",
        isStudentOnRoster: false,
      }),
    ).toBe(false);
  });

  test("private teacher: allows rostered student", () => {
    expect(
      studentMayAccessTeacherBookingFlow({
        marketplaceHidden: true,
        viewerStudentId: "stu-1",
        isStudentOnRoster: true,
      }),
    ).toBe(true);
  });
});
