import { describe, expect, test } from "vitest";
import { getAuthenticatedDefaultRoute } from "@/lib/authenticated-default-route";

describe("getAuthenticatedDefaultRoute", () => {
  test("routes completed student onboarding to dashboard", () => {
    expect(
      getAuthenticatedDefaultRoute({
        role: "STUDENT",
        studentOnboardingCompleted: true,
      }),
    ).toBe("/dashboard");
  });

  test("keeps incomplete student onboarding on the onboarding path", () => {
    expect(
      getAuthenticatedDefaultRoute({
        role: "STUDENT",
        studentOnboardingCompleted: false,
      }),
    ).toBe("/onboarding");
  });

  test("routes completed teacher onboarding to dashboard", () => {
    expect(
      getAuthenticatedDefaultRoute({
        role: "TEACHER",
        teacherOnboardingCompleted: true,
      }),
    ).toBe("/dashboard");
  });

  test("keeps incomplete teacher onboarding on the teacher onboarding path", () => {
    expect(
      getAuthenticatedDefaultRoute({
        role: "TEACHER",
        teacherOnboardingCompleted: false,
      }),
    ).toBe("/onboarding/teacher");
  });

  test("routes admin roles to dashboard without onboarding checks", () => {
    expect(getAuthenticatedDefaultRoute({ role: "SUPER_ADMIN" })).toBe("/dashboard");
  });
});
