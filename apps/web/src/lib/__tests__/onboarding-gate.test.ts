import { describe, expect, test } from "vitest";
import { getOnboardingRedirectForRole } from "@/lib/onboarding-redirect";

describe("getOnboardingRedirectForRole", () => {
  test("returns student onboarding route when student incomplete", () => {
    expect(
      getOnboardingRedirectForRole({
        role: "STUDENT",
        studentOnboardingCompleted: false,
      }),
    ).toBe("/onboarding");
  });

  test("returns teacher onboarding route when teacher incomplete", () => {
    expect(
      getOnboardingRedirectForRole({
        role: "TEACHER",
        teacherOnboardingCompleted: false,
      }),
    ).toBe("/onboarding/teacher");
  });

  test("requires teacher onboarding after role promotion even if student onboarding is complete", () => {
    expect(
      getOnboardingRedirectForRole({
        role: "TEACHER",
        studentOnboardingCompleted: true,
        teacherOnboardingCompleted: false,
      }),
    ).toBe("/onboarding/teacher");
  });

  test("returns null when role has completed onboarding", () => {
    expect(
      getOnboardingRedirectForRole({
        role: "STUDENT",
        studentOnboardingCompleted: true,
      }),
    ).toBeNull();
    expect(
      getOnboardingRedirectForRole({
        role: "TEACHER",
        teacherOnboardingCompleted: true,
      }),
    ).toBeNull();
  });
});
