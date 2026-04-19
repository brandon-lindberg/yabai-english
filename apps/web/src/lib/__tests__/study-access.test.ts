import { describe, expect, test, vi } from "vitest";
import { StudyLevelCode } from "@/generated/prisma/client";
import { isStudyLevelUnlocked } from "@/lib/study/access";

describe("isStudyLevelUnlocked", () => {
  test("allows teachers to access all levels", async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ role: "TEACHER" }),
      },
    } as unknown as Parameters<typeof isStudyLevelUnlocked>[0];

    const unlocked = await isStudyLevelUnlocked(
      prisma,
      "teacher-user-1",
      "track-1",
      StudyLevelCode.ADVANCED_3,
    );

    expect(unlocked).toBe(true);
  });

  test("keeps student gating logic for higher levels", async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ role: "STUDENT" }),
      },
      studentProfile: {
        findUnique: vi.fn().mockResolvedValue({ placedLevel: "UNSET", placedSubLevel: null }),
      },
      studyLevel: {
        findUnique: vi.fn().mockResolvedValue({ id: "prev-level" }),
      },
      userStudyLevelProgress: {
        findUnique: vi.fn().mockResolvedValue({ assessmentPassedAt: null }),
      },
    } as unknown as Parameters<typeof isStudyLevelUnlocked>[0];

    const unlocked = await isStudyLevelUnlocked(
      prisma,
      "student-user-1",
      "track-1",
      StudyLevelCode.BEGINNER_2,
    );

    expect(unlocked).toBe(false);
  });
});
