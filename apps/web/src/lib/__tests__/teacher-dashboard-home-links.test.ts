import { describe, expect, test } from "vitest";
import { TEACHER_HOME_SCHEDULE_HREFS, withDashboardOnboarding } from "@/lib/teacher-dashboard-home-links";

describe("withDashboardOnboarding", () => {
  test("returns href unchanged when onboarding is absent", () => {
    expect(withDashboardOnboarding("/dashboard/schedule", null)).toBe("/dashboard/schedule");
    expect(withDashboardOnboarding("/dashboard/schedule", undefined)).toBe("/dashboard/schedule");
    expect(withDashboardOnboarding("/dashboard/schedule", "   ")).toBe("/dashboard/schedule");
  });

  test("appends onboardingNext query param", () => {
    expect(withDashboardOnboarding("/dashboard/schedule", "/dashboard/profile")).toBe(
      "/dashboard/schedule?onboardingNext=%2Fdashboard%2Fprofile",
    );
  });

  test("uses ampersand when href already has query", () => {
    expect(withDashboardOnboarding("/dashboard/schedule?foo=1", "/next")).toBe(
      "/dashboard/schedule?foo=1&onboardingNext=%2Fnext",
    );
  });
});

describe("TEACHER_HOME_SCHEDULE_HREFS", () => {
  test("points at schedule sub-pages", () => {
    expect(TEACHER_HOME_SCHEDULE_HREFS.upcoming).toBe("/dashboard/schedule");
    expect(TEACHER_HOME_SCHEDULE_HREFS.completed).toBe("/dashboard/schedule/completed");
    expect(TEACHER_HOME_SCHEDULE_HREFS.availability).toBe("/dashboard/schedule/availability");
  });
});
