import { describe, expect, test } from "vitest";
import {
  learningLanguageSchema,
  resolveLearningLanguage,
  learningLanguageTeacherWhere,
  learningLanguageAvailabilityWhere,
  slotsForLearningLanguage,
} from "../learning-language";
import { marketplaceTeacherWhere } from "../marketplace-teacher-filter";

describe("learning language is a subject, independent of UI/instruction language", () => {
  test("accepts only explicit subjects; locale codes cannot select a subject", () => {
    for (const value of ["ENGLISH", "JAPANESE"]) {
      expect(learningLanguageSchema.parse(value)).toBe(value);
      expect(resolveLearningLanguage(value)).toBe(value);
    }
    for (const value of ["ja", "en", "JA", "EN", "French", "", null]) {
      expect(learningLanguageSchema.safeParse(value).success).toBe(false);
    }
    expect(resolveLearningLanguage(undefined)).toBe("ENGLISH");
  });

  test.each([null, "student-1"])("roster/public discovery retains the subject boundary (%s)", (viewer) => {
    // Roster privacy has an OR too: subject and visibility must be ANDed.
    expect(marketplaceTeacherWhere(viewer, "JAPANESE").AND).toContainEqual(
      learningLanguageTeacherWhere("JAPANESE"),
    );
  });

  test("Japanese discovery requires an active Japanese offering", () => {
    expect(learningLanguageTeacherWhere("JAPANESE")).toEqual({
      teachingLanguages: { has: "JAPANESE" },
      lessonOfferings: { some: { active: true, learningLanguage: "JAPANESE" } },
    });
  });

  test("unlinked historical availability is English only", () => {
    const slots = [
      { id: "legacy", teacherLessonOffering: null },
      { id: "en", teacherLessonOffering: { active: true, learningLanguage: "ENGLISH" as const } },
      { id: "ja", teacherLessonOffering: { active: true, learningLanguage: "JAPANESE" as const } },
      { id: "retired-ja", teacherLessonOffering: { active: false, learningLanguage: "JAPANESE" as const } },
    ];
    expect(slotsForLearningLanguage(slots, "ENGLISH").map((s) => s.id)).toEqual(["legacy", "en"]);
    expect(slotsForLearningLanguage(slots, "JAPANESE").map((s) => s.id)).toEqual(["ja"]);
    expect(learningLanguageAvailabilityWhere("JAPANESE")).toEqual({
      teacherLessonOffering: { is: { active: true, learningLanguage: "JAPANESE" } },
    });
    expect(learningLanguageAvailabilityWhere("ENGLISH")).toEqual({
      OR: [
        { teacherLessonOffering: { is: { active: true, learningLanguage: "ENGLISH" } } },
        { teacherLessonOfferingId: null },
      ],
    });
  });
});
