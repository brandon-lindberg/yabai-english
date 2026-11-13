import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { japanesePracticeFixture } from "./japanese-prompt-fixture";

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export async function seedJapaneseStudy(db: PrismaClient) {
  const fixture = japanesePracticeFixture();
  await db.user.createMany({ data: [
    { id: "learner", role: "STUDENT", learningLanguage: "JAPANESE" },
    { id: "other", role: "STUDENT", learningLanguage: "JAPANESE" },
    { id: "english-user", role: "STUDENT", learningLanguage: "ENGLISH" },
    { id: "teacher", role: "TEACHER", learningLanguage: "JAPANESE" },
    { id: "hidden", role: "STUDENT", learningLanguage: "JAPANESE", accountStatus: "HIDDEN" },
  ] });
  await db.studyCatalogSnapshot.create({ data: { id: "snapshot", studyCatalogSha256: "a".repeat(64), sourceCatalogSha256: "b".repeat(64), sourceLockSha256: "c".repeat(64), policySha256: "d".repeat(64), provenanceJson: { source: { reconciliation: [] } } } });
  await db.studyTrack.create({ data: { id: "track", slug: "japanese-flashcards", titleJa: "合成テスト", titleEn: "Synthetic test", learningLanguage: "JAPANESE", publicationStatus: "PUBLISHED", catalogSnapshotId: "snapshot" } });
  for (const [sortOrder, levelCode] of (["N5", "N4", "N3", "N2", "N1"] as const).entries()) {
    await db.studyLevel.create({ data: { id: `level-${levelCode}`, trackId: "track", levelCode, titleJa: levelCode, titleEn: levelCode, sortOrder } });
    await db.studyDeck.create({ data: { id: `deck-${levelCode}`, levelId: `level-${levelCode}`, titleJa: "合成テスト", titleEn: "Synthetic test" } });
  }
  await db.studyCard.createMany({ data: fixture.all.map((content, sortOrder) => ({ id: content.unit.id, kind: content.unit.kind === "kanji" ? "JAPANESE_KANJI" : "JAPANESE_VOCABULARY", deckId: `deck-${content.unit.level.code}`, frontJa: "", backEn: "", contentJson: json(content), sortOrder })) });
}

export const japaneseStudyAnswer = async (db: PrismaClient, promptId: string) => {
  const stored = await db.studyReviewPrompt.findUniqueOrThrow({ where: { id: promptId } });
  return { promptId, choiceId: (stored.answerJson as { correctChoiceId: string }).correctChoiceId };
};

