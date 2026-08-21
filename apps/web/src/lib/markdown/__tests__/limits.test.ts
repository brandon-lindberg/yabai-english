import { describe, expect, test } from "vitest";
import {
  clipMarkdown,
  TEACHER_BIO_MAX_CHARS,
  TEACHER_CREDENTIALS_MAX_CHARS,
} from "../limits";

describe("clipMarkdown", () => {
  test("returns the input untouched when it is within the cap", () => {
    expect(clipMarkdown("**hi**", 10)).toBe("**hi**");
  });

  test("returns the input untouched at exactly the cap", () => {
    // The boundary the editor's onChange leans on: at-limit must not resync,
    // or every keystroke at the cap would reset the caret to the end.
    expect(clipMarkdown("abcde", 5)).toBe("abcde");
  });

  test("clips to the cap when over", () => {
    expect(clipMarkdown("abcdefg", 5)).toBe("abcde");
  });

  test("treats a missing or non-positive cap as uncapped", () => {
    const long = "x".repeat(5000);
    expect(clipMarkdown(long, undefined)).toBe(long);
    expect(clipMarkdown(long, 0)).toBe(long);
  });
});

describe("stored markdown caps", () => {
  test("teacher caps match the API and Prisma columns", () => {
    // TeacherProfile.bio / .credentials are @db.Text, validated at 2000 in
    // both /api/teacher/profile and /api/admin/users/[userId].
    expect(TEACHER_BIO_MAX_CHARS).toBe(2000);
    expect(TEACHER_CREDENTIALS_MAX_CHARS).toBe(2000);
  });
});
