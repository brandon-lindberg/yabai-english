import { expect, test } from "vitest";
import { teachingLanguagesSchema, teacherCanTeach, learningLanguageTeacherWhere } from "../learning-language";

test("admin teaching assignments are explicit, nonempty, unique and canonical", () => {
  expect(teachingLanguagesSchema.parse(["JAPANESE", "ENGLISH"])).toEqual(["ENGLISH", "JAPANESE"]);
  for (const input of [undefined, [], ["ENGLISH", "ENGLISH"], ["ja"], ["JAPANESE", "FRENCH"]]) expect(() => teachingLanguagesSchema.parse(input)).toThrow();
});
test("a single-subject assignment cannot authorize the opposite subject", () => {
  expect(teacherCanTeach({ teachingLanguages: ["JAPANESE"] }, "ENGLISH")).toBe(false);
  expect(teacherCanTeach({ teachingLanguages: ["ENGLISH"] }, "JAPANESE")).toBe(false);
  expect(teacherCanTeach({ teachingLanguages: ["JAPANESE", "ENGLISH"] }, "JAPANESE")).toBe(true);
  expect(teacherCanTeach({ teachingLanguages: [] }, "ENGLISH")).toBe(false);
});
test("legacy marketplace fallback cannot bypass an admin teaching assignment", () => {
  expect(learningLanguageTeacherWhere("ENGLISH")).toMatchObject({ teachingLanguages: { has: "ENGLISH" } });
  expect(learningLanguageTeacherWhere("JAPANESE")).toMatchObject({ teachingLanguages: { has: "JAPANESE" } });
});
