import { describe, expect, test } from "vitest";
import { canRescheduleSchoolClassBooking } from "@/lib/school-booking-reschedule-authorization";

const schoolId = "school-1";
const teacherMemId = "tm-1";

describe("canRescheduleSchoolClassBooking", () => {
  test("allows school admin", () => {
    expect(
      canRescheduleSchoolClassBooking(
        {
          id: "admin-mem",
          orgRole: "SCHOOL_ADMIN",
          status: "ACTIVE",
          schoolId,
          organizationId: "org-1",
          userId: "u-admin",
        },
        schoolId,
        teacherMemId,
      ),
    ).toBe(true);
  });

  test("allows assigned teacher membership", () => {
    expect(
      canRescheduleSchoolClassBooking(
        {
          id: teacherMemId,
          orgRole: "TEACHER",
          status: "ACTIVE",
          schoolId,
          organizationId: "org-1",
          userId: "u-teacher",
        },
        schoolId,
        teacherMemId,
      ),
    ).toBe(true);
  });

  test("denies other teacher", () => {
    expect(
      canRescheduleSchoolClassBooking(
        {
          id: "tm-other",
          orgRole: "TEACHER",
          status: "ACTIVE",
          schoolId,
          organizationId: "org-1",
          userId: "u-other",
        },
        schoolId,
        teacherMemId,
      ),
    ).toBe(false);
  });

  test("denies inactive membership", () => {
    expect(
      canRescheduleSchoolClassBooking(
        {
          id: teacherMemId,
          orgRole: "TEACHER",
          status: "INVITED",
          schoolId,
          organizationId: "org-1",
          userId: "u-teacher",
        },
        schoolId,
        teacherMemId,
      ),
    ).toBe(false);
  });
});
