import { expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { japaneseStudyProgression, getJapaneseStudyProgression } from "@/lib/study/japanese-progression";

it("opens N5 by default and honors only Japanese placement bands", () => {
  expect(japaneseStudyProgression({}).unlocked).toEqual(["N5"]);
  expect(japaneseStudyProgression({ placementBand: "N3" }).unlocked).toEqual(["N5", "N4", "N3"]);
  expect(japaneseStudyProgression({ placementBand: "BELOW_N5" }).unlocked).toEqual(["N5"]);
  expect(japaneseStudyProgression({ placementBand: "ADVANCED_3" }).unlocked).toEqual(["N5"]);
});

it("requires all nonempty level units to be mastered to progress and preserves earned access", () => {
  const summary = (total: number, mastered: number) => ({ total, mastered });
  expect(japaneseStudyProgression({ mastery: { N5: summary(10, 9) } }).unlocked).toEqual(["N5"]);
  expect(japaneseStudyProgression({ mastery: { N5: summary(10, 10) } })).toMatchObject({ unlocked: ["N5", "N4"], mastered: ["N5"] });
  expect(japaneseStudyProgression({ mastery: { N5: summary(0, 0) } }).mastered).toEqual([]);
  expect(japaneseStudyProgression({ earnedLevels: ["N3"], placementBand: "N5" }).unlocked).toEqual(["N5", "N4", "N3"]);
  expect(japaneseStudyProgression({ completedLevels: ["N1"] }).unlocked).toEqual(["N5", "N4", "N3", "N2", "N1"]);
});

it.each([
  null, { role: "STUDENT", accountStatus: "ACTIVE", learningLanguage: "ENGLISH" },
  { role: "STUDENT", accountStatus: "HIDDEN", learningLanguage: "JAPANESE" },
  { role: "TEACHER", accountStatus: "ACTIVE", learningLanguage: "JAPANESE" },
])("denies ineligible learners before reading study or placement data: %j", async user => {
  const track = vi.fn(); const placement = vi.fn();
  const db = { user: { findUnique: vi.fn().mockResolvedValue(user) }, studyTrack: { findUnique: track }, japanesePlacementAttempt: { findFirst: placement } } as unknown as PrismaClient;
  expect(await getJapaneseStudyProgression(db, "student")).toEqual({ available: false });
  expect(track).not.toHaveBeenCalled(); expect(placement).not.toHaveBeenCalled();
});

it("keeps draft publication enforced before querying assessment or study progress", async () => {
  const findUnique = vi.fn().mockResolvedValue(null); const placement = vi.fn();
  const db = { user: { findUnique: vi.fn().mockResolvedValue({ role: "STUDENT", accountStatus: "ACTIVE", learningLanguage: "JAPANESE" }) }, studyTrack: { findUnique }, japanesePlacementAttempt: { findFirst: placement } } as unknown as PrismaClient;
  expect(await getJapaneseStudyProgression(db, "student")).toEqual({ available: false });
  expect(findUnique.mock.calls[0][0].where).toMatchObject({ learningLanguage: "JAPANESE", publicationStatus: "PUBLISHED" });
  expect(placement).not.toHaveBeenCalled();
});
