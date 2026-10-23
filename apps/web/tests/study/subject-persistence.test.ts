import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { studyLevelIndex, nextStudyLevel, previousStudyLevel } from "@/lib/study/constants";
import { isStudyLevelUnlocked } from "@/lib/study/access";
import { getOrCreateQuickReviewCards, applyQuickReviewOutcome, utcCalendarDayKey } from "@/lib/study/quick-review";

describe("subject-scoped study foundations", () => {
  it("keeps independent English and Japanese level sequences", () => {
    expect(studyLevelIndex("N5", "JAPANESE")).toBe(0);
    expect(nextStudyLevel("N3", "JAPANESE")).toBe("N2");
    expect(previousStudyLevel("N5", "JAPANESE")).toBeNull();
    expect(nextStudyLevel("N1", "JAPANESE")).toBeNull();
    expect(nextStudyLevel("BEGINNER_3")).toBe("INTERMEDIATE_1");
    expect(() => studyLevelIndex("N5", "ENGLISH")).toThrow(/level/i);
    expect(() => studyLevelIndex("BEGINNER_1", "JAPANESE")).toThrow(/level/i);
  });

  it.each([
    { learningLanguage: "JAPANESE", publicationStatus: "DRAFT" },
    { learningLanguage: "JAPANESE", publicationStatus: "PUBLISHED" },
    { learningLanguage: "ENGLISH", publicationStatus: "DRAFT" },
    null,
  ])("denies unavailable or other-language tracks even for teachers: %j", async (track) => {
    const db = {
      studyTrack: { findUnique: vi.fn().mockResolvedValue(track) },
      user: { findUnique: vi.fn().mockResolvedValue({ role: "TEACHER" }) },
    } as unknown as PrismaClient;
    expect(await isStudyLevelUnlocked(db, "teacher", "track", "BEGINNER_1")).toBe(false);
  });

  it("keys daily review by subject and filters cached cards by subject, publication and English card kind", async () => {
    const findUnique = vi.fn().mockResolvedValue({ cardIds: ["english-card"], interactions: [] });
    const findMany = vi.fn().mockResolvedValue([{ id: "english-card", frontJa: "猫", backEn: "cat" }]);
    const db = { studyQuickReviewDay: { findUnique }, studyCard: { findMany } } as unknown as PrismaClient;
    expect((await getOrCreateQuickReviewCards(db, "student", "ENGLISH")).cards).toHaveLength(1);
    expect(findUnique).toHaveBeenCalledWith({ where: { userId_learningLanguage_dayKey: { userId: "student", learningLanguage: "ENGLISH", dayKey: utcCalendarDayKey() } } });
    expect(findMany.mock.calls[0][0].where).toMatchObject({ kind: "ENGLISH_EXERCISE", deck: { level: { track: { learningLanguage: "ENGLISH", publicationStatus: "PUBLISHED" } } } });
  });

  it("does not run Japanese records through the English quick-review formatter", async () => {
    const findMany = vi.fn();
    const db = { studyCard: { findMany } } as unknown as PrismaClient;
    expect(await getOrCreateQuickReviewCards(db, "student", "JAPANESE")).toMatchObject({ cards: [], learnedToday: 0, notYetToday: 0 });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("rejects a poisoned cross-language cached slot before recording an interaction", async () => {
    const update = vi.fn();
    const db = {
      studyQuickReviewDay: { findUnique: vi.fn().mockResolvedValue({ id: "day", cardIds: ["japanese-card"], interactions: [] }), update },
      studyCard: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;
    expect(await applyQuickReviewOutcome(db, "student", { dayKey: utcCalendarDayKey(), cardId: "japanese-card", outcome: "not_yet" }, "ENGLISH"))
      .toEqual({ ok: false, error: "card_not_in_review" });
    expect(update).not.toHaveBeenCalled();
  });
});
