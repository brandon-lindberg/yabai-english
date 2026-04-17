import { describe, expect, test } from "vitest";
import { buildTeacherCardProfileHref } from "@/lib/teacher-card-href";

describe("buildTeacherCardProfileHref", () => {
  test("returns plain profile path when no onboarding params are provided", () => {
    expect(buildTeacherCardProfileHref("t-1", null, null)).toBe(
      "/book/teachers/t-1",
    );
  });

  test("preserves onboardingNext and onboardingStep on the profile link", () => {
    const href = buildTeacherCardProfileHref(
      "t-1",
      "/onboarding/next",
      "bookLesson",
    );
    expect(href).toContain("/book/teachers/t-1?");
    expect(href).toContain(
      `onboardingNext=${encodeURIComponent("/onboarding/next")}`,
    );
    expect(href).toContain("onboardingStep=bookLesson");
  });

  test("omits missing params but keeps present ones", () => {
    expect(buildTeacherCardProfileHref("t-2", "/onboarding/next", null)).toBe(
      `/book/teachers/t-2?onboardingNext=${encodeURIComponent("/onboarding/next")}`,
    );
    expect(buildTeacherCardProfileHref("t-2", null, "bookLesson")).toBe(
      "/book/teachers/t-2?onboardingStep=bookLesson",
    );
  });
});
