import { describe, expect, it } from "vitest";
import { buildLocalizedTeacherProfilePath, buildTeacherCardProfileHref } from "../teacher-card-href";

describe("buildTeacherCardProfileHref", () => {
  it("includes onboarding query", () => {
    expect(buildTeacherCardProfileHref("tid", "/onboarding", "1")).toBe(
      "/book/teachers/tid?onboardingNext=%2Fonboarding&onboardingStep=1",
    );
  });
});

describe("buildLocalizedTeacherProfilePath", () => {
  it("localizes for English", () => {
    expect(buildLocalizedTeacherProfilePath("en", "tid", null, null)).toBe("/en/book/teachers/tid");
  });

  it("omits prefix for Japanese default", () => {
    expect(buildLocalizedTeacherProfilePath("ja", "tid", null, null)).toBe("/book/teachers/tid");
  });
});
