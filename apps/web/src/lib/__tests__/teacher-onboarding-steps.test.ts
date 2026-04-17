import { describe, expect, test } from "vitest";
import { isTeacherOnboardingOptionalStep } from "@/lib/teacher-onboarding-steps";

describe("isTeacherOnboardingOptionalStep", () => {
  test("marks integrations and availability as optional", () => {
    expect(isTeacherOnboardingOptionalStep("integrations")).toBe(true);
    expect(isTeacherOnboardingOptionalStep("availability")).toBe(true);
  });

  test("keeps other onboarding steps required", () => {
    expect(isTeacherOnboardingOptionalStep("profile")).toBe(false);
    expect(isTeacherOnboardingOptionalStep("students")).toBe(false);
    expect(isTeacherOnboardingOptionalStep("chat")).toBe(false);
    expect(isTeacherOnboardingOptionalStep("notes")).toBe(false);
    expect(isTeacherOnboardingOptionalStep("materials")).toBe(false);
  });
});
