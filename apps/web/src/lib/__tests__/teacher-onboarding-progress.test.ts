import { describe, expect, test } from "vitest";
import {
  buildTeacherOnboardingReturnFromProfile,
  buildTeacherOnboardingContinueHref,
  normalizeOnboardingNextHref,
  parseCompletedTeacherOnboardingSteps,
} from "@/lib/teacher-onboarding-progress";

describe("teacher onboarding progress utils", () => {
  test("parses and deduplicates valid completed steps", () => {
    expect(parseCompletedTeacherOnboardingSteps("profile,integrations,profile,invalid")).toEqual([
      "profile",
      "integrations",
    ]);
  });

  test("builds dashboard href with encoded onboarding return target", () => {
    expect(
      buildTeacherOnboardingContinueHref("/dashboard/profile", ["profile"], "integrations"),
    ).toContain(
      "onboardingNext=%2Fonboarding%2Fteacher%3Fcompleted%3Dprofile%252Cintegrations",
    );
  });

  test("builds profile post-save return when onboarding is incomplete", () => {
    expect(buildTeacherOnboardingReturnFromProfile(null, null)).toBe(
      "/onboarding/teacher?completed=profile",
    );
    expect(
      buildTeacherOnboardingReturnFromProfile(null, "integrations"),
    ).toBe("/onboarding/teacher?completed=integrations%2Cprofile");
  });

  test("returns null when onboarding is already complete", () => {
    expect(
      buildTeacherOnboardingReturnFromProfile(new Date("2026-04-01T00:00:00.000Z"), null),
    ).toBeNull();
  });

  test("normalizes onboarding next href", () => {
    expect(normalizeOnboardingNextHref("%2Fonboarding%2Fteacher")).toBe("/onboarding/teacher");
    expect(normalizeOnboardingNextHref("/onboarding/teacher")).toBe("/onboarding/teacher");
  });
});
