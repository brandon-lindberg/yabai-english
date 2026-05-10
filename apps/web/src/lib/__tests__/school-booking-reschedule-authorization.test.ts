import { describe, expect, test } from "vitest";
import {
  canDirectRescheduleSchoolClassBooking,
  canSubmitSchoolClassRescheduleRequest,
} from "@/lib/school-booking-reschedule-authorization";

const schoolId = "school-1";
const teacherMemId = "tm-1";

describe("canDirectRescheduleSchoolClassBooking", () => {
  test("allows school admin", () => {
    expect(
      canDirectRescheduleSchoolClassBooking(
        {
          id: "admin-mem",
          orgRole: "SCHOOL_ADMIN",
          status: "ACTIVE",
          schoolId,
          organizationId: "org-1",
          userId: "u-admin",
        },
        schoolId,
      ),
    ).toBe(true);
  });

  test("allows org-wide OWNER", () => {
    expect(
      canDirectRescheduleSchoolClassBooking(
        {
          id: "owner-mem",
          orgRole: "OWNER",
          status: "ACTIVE",
          schoolId: null,
          organizationId: "org-1",
          userId: "u-owner",
        },
        schoolId,
      ),
    ).toBe(true);
  });

  test("denies assigned teacher", () => {
    expect(
      canDirectRescheduleSchoolClassBooking(
        {
          id: teacherMemId,
          orgRole: "TEACHER",
          status: "ACTIVE",
          schoolId,
          organizationId: "org-1",
          userId: "u-teacher",
        },
        schoolId,
      ),
    ).toBe(false);
  });

  test("denies inactive membership", () => {
    expect(
      canDirectRescheduleSchoolClassBooking(
        {
          id: "admin-mem",
          orgRole: "SCHOOL_ADMIN",
          status: "INVITED",
          schoolId,
          organizationId: "org-1",
          userId: "u-admin",
        },
        schoolId,
      ),
    ).toBe(false);
  });
});

describe("canSubmitSchoolClassRescheduleRequest", () => {
  test("allows assigned teacher membership", () => {
    expect(
      canSubmitSchoolClassRescheduleRequest(
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

  test("denies school admin (they use direct reschedule)", () => {
    expect(
      canSubmitSchoolClassRescheduleRequest(
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
    ).toBe(false);
  });

  test("denies other teacher", () => {
    expect(
      canSubmitSchoolClassRescheduleRequest(
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
});
