import { describe, expect, test } from "vitest";
import { getStudentPostOnboardingRoute } from "@/lib/onboarding-routing";

describe("getStudentPostOnboardingRoute", () => {
  test("routes students with unset level to onboarding decision page", () => {
    expect(getStudentPostOnboardingRoute("UNSET")).toBe("/onboarding/next");
  });

  test("routes students with a placed level to dashboard", () => {
    expect(getStudentPostOnboardingRoute("BEGINNER")).toBe("/dashboard");
    expect(getStudentPostOnboardingRoute("INTERMEDIATE")).toBe("/dashboard");
    expect(getStudentPostOnboardingRoute("ADVANCED")).toBe("/dashboard");
  });
});
