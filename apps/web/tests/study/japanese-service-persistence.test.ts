import { expect, test, vi } from "vitest";
import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { withIsolatedPostgres } from "../../test/isolated-postgres";
import { japanesePracticeFixture } from "../../test/japanese-prompt-fixture";
import { createJapaneseStudyQueue, submitJapaneseStudyReview, getJapaneseStudyOverview } from "@/lib/study/japanese-service";

const migration = "20261023030000_study_review_prompts";
const enabled = !!process.env.MIRROR_TEST_DATABASE_URL;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

async function seed(db: PrismaClient) {
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

const answer = async (db: PrismaClient, promptId: string) => {
  const stored = await db.studyReviewPrompt.findUniqueOrThrow({ where: { id: promptId } });
  return { promptId, choiceId: (stored.answerJson as { correctChoiceId: string }).correctChoiceId };
};

test.runIf(enabled)("issues private unique queues, rotates tasks and saves concurrent identical retries once", async () => {
  await withIsolatedPostgres(migration, async ({ db, applyMigration, verifyDatamodel }) => {
    await applyMigration(); await verifyDatamodel(); await seed(db);
    const empty = await getJapaneseStudyOverview(db, "learner");
    expect(empty).toMatchObject({ available: true, unlocked: ["N5"] });
    const [first, again] = await Promise.all([
      createJapaneseStudyQueue(db, "learner", { levelCode: "N5", limit: 50 }),
      createJapaneseStudyQueue(db, "learner", { levelCode: "N5", limit: 50 }),
    ]);
    expect(first.cards).toHaveLength(9);
    expect(new Set(first.cards.map(card => card.question.unitId)).size).toBe(9);
    expect(new Set(again.cards.map(card => card.question.id))).toEqual(new Set(first.cards.map(card => card.question.id)));
    expect(JSON.stringify(first)).not.toMatch(/correctChoiceId|answerJson|feedback|acceptedPairs|originalContent/);
    expect(await db.studyReviewPrompt.count()).toBe(9);
    await expect(db.studyReviewPrompt.create({ data: {
      id: "missing-question-identity", userId: "learner", cardId: "extra-1", catalogSnapshotId: "snapshot",
      contentSha256: "a".repeat(64), baseReps: 0, studyBand: "N5", questionJson: {}, answerJson: { correctChoiceId: "invalid" },
      issuedAt: new Date(), expiresAt: new Date(Date.now() + 10000),
    } })).rejects.toThrow();
    await expect(db.studyReviewPrompt.update({ where: { id: first.cards[0].question.id }, data: { answerJson: {} } })).rejects.toThrow(/immutable/i);
    await expect(db.studyReviewPrompt.update({ where: { id: first.cards[0].question.id }, data: { resultJson: {} } })).rejects.toThrow();
    const target = first.cards.find(card => card.question.unitId === "extra-1")!;
    expect(target.question.task).toBe("vocabulary_meaning");
    const input = await answer(db, target.question.id);
    const [a, b] = await Promise.all([
      submitJapaneseStudyReview(db, "learner", { ...input, answerTimeMs: 4000 }),
      submitJapaneseStudyReview(db, "learner", { ...input, answerTimeMs: 9000 }),
    ]);
    expect(a).toEqual(b);
    expect(a).toMatchObject({ correct: true, xpGained: 12, correctCount: 1, wrongCount: 0, feedback: { written: "猫", reading: "ねこ" } });
    expect((await db.userStudyLevelProgress.findUniqueOrThrow({ where: { userId_levelId: { userId: "learner", levelId: "level-N5" } } })).xp).toBe(12);
    expect((await db.userStudyCardState.findUniqueOrThrow({ where: { userId_cardId: { userId: "learner", cardId: "extra-1" } } })).reps).toBe(1);
    const wrong = target.question.choices.find(choice => choice.id !== input.choiceId)!;
    await expect(submitJapaneseStudyReview(db, "learner", { promptId: input.promptId, choiceId: wrong.id })).rejects.toMatchObject({ status: 409, code: "REVIEW_CONFLICT" });
    const next = await createJapaneseStudyQueue(db, "learner", { levelCode: "N5", limit: 50 });
    expect(next.cards.find(card => card.question.unitId === "extra-1")!.question.task).toBe("vocabulary_reading");
    await expect(db.studyReviewPrompt.update({ where: { id: input.promptId }, data: { resultJson: {} } })).rejects.toThrow(/immutable/i);
  });
}, 30_000);

test.runIf(enabled)("denies guests, other learners, wrong subjects, locked levels, forged fields, stale content and unpublished catalogs", async () => {
  await withIsolatedPostgres(migration, async ({ db, applyMigration }) => {
    await applyMigration(); await seed(db);
    for (const user of ["unknown", "english-user", "hidden", "teacher"]) {
      await expect(createJapaneseStudyQueue(db, user, { levelCode: "N5" })).rejects.toMatchObject({ status: user === "unknown" ? 401 : 403 });
    }
    await expect(createJapaneseStudyQueue(db, "learner", { levelCode: "N3" })).rejects.toMatchObject({ status: 403, code: "LEVEL_LOCKED" });
    await expect(createJapaneseStudyQueue(db, "learner", { levelCode: "BEGINNER_1" })).rejects.toMatchObject({ status: 400 });
    await expect(createJapaneseStudyQueue(db, "learner", { levelCode: "N5", studyBand: "N1" })).rejects.toMatchObject({ status: 400 });
    const queue = await createJapaneseStudyQueue(db, "learner", { levelCode: "N5", limit: 50 });
    const question = queue.cards[0].question;
    const input = await answer(db, question.id);
    await expect(submitJapaneseStudyReview(db, "other", input)).rejects.toMatchObject({ status: 404 });
    await expect(submitJapaneseStudyReview(db, "learner", { ...input, correct: true })).rejects.toMatchObject({ status: 400 });
    await expect(submitJapaneseStudyReview(db, "learner", { ...input, choiceId: "forged" })).rejects.toMatchObject({ status: 400 });
    await db.studyCard.update({ where: { id: question.unitId }, data: { sortOrder: 999 } });
    await expect(submitJapaneseStudyReview(db, "learner", input)).rejects.toMatchObject({ status: 409, code: "PROMPT_STALE" });
    await db.studyTrack.update({ where: { id: "track" }, data: { publicationStatus: "DRAFT" } });
    await expect(createJapaneseStudyQueue(db, "learner", { levelCode: "N5" })).rejects.toMatchObject({ status: 503 });
    await expect(submitJapaneseStudyReview(db, "learner", input)).rejects.toMatchObject({ status: 503 });
    expect(await db.userStudyCardState.count()).toBe(0);
  });
}, 30_000);

test.runIf(enabled)("saves mastery milestones atomically and rolls back failed reviews", async () => {
  await withIsolatedPostgres(migration, async ({ client, db, applyMigration }) => {
    await applyMigration(); await seed(db);
    const cards = await db.studyCard.findMany({ where: { deckId: "deck-N5" } });
    await db.userStudyCardState.createMany({ data: cards.map(card => ({ userId: "learner", cardId: card.id, correctCount: 8, streakCorrect: 5, reps: 8 })) });
    await db.userStudyCardState.update({ where: { userId_cardId: { userId: "learner", cardId: "extra-1" } }, data: { correctCount: 7, reps: 7, streakCorrect: 4 } });
    const queue = await createJapaneseStudyQueue(db, "learner", { levelCode: "N5", limit: 50 });
    const target = queue.cards.find(card => card.question.unitId === "extra-1")!;
    const input = await answer(db, target.question.id);
    const before = await db.userStudyLevelProgress.findMany({ where: { userId: "learner" }, orderBy: { id: "asc" } });
    await client.query(`CREATE FUNCTION fail_study_save() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic result failure'; END; $$; CREATE TRIGGER fail_study_save BEFORE UPDATE ON "StudyReviewPrompt" FOR EACH ROW EXECUTE FUNCTION fail_study_save();`);
    await expect(submitJapaneseStudyReview(db, "learner", input)).rejects.toThrow();
    expect((await db.userStudyCardState.findUniqueOrThrow({ where: { userId_cardId: { userId: "learner", cardId: "extra-1" } } })).correctCount).toBe(7);
    expect(await db.userStudyLevelProgress.findMany({ where: { userId: "learner" }, orderBy: { id: "asc" } })).toEqual(before);
    await client.query('DROP TRIGGER fail_study_save ON "StudyReviewPrompt"');
    expect(await submitJapaneseStudyReview(db, "learner", input)).toMatchObject({ correct: true, unlocked: ["N5", "N4"], completed: ["N5"] });
    expect(await db.userStudyLevelProgress.findUnique({ where: { userId_levelId: { userId: "learner", levelId: "level-N5" } } })).toMatchObject({ masteryScore: 100, completedAt: expect.any(Date), assessmentPassedAt: null });
    expect(await db.userStudyLevelProgress.findUnique({ where: { userId_levelId: { userId: "learner", levelId: "level-N4" } } })).toBeTruthy();
    expect(await db.userStudyAssessmentAttempt.count()).toBe(0);
    await db.userStudyCardState.update({ where: { userId_cardId: { userId: "learner", cardId: "extra-1" } }, data: { wrongCount: 5, streakCorrect: 0 } });
    expect(await getJapaneseStudyOverview(db, "learner")).toMatchObject({ unlocked: ["N5", "N4"] });
  });
}, 30_000);

test.runIf(enabled)("expires questions without progress, filters practice, and preserves concurrent distinct answers", async () => {
  await withIsolatedPostgres(migration, async ({ db, applyMigration }) => {
    await applyMigration(); await seed(db);
    const queue = await createJapaneseStudyQueue(db, "learner", { levelCode: "N5", kind: "vocabulary", limit: 50 });
    expect(queue.cards).toHaveLength(4);
    expect(queue.cards.every(card => card.question.task.startsWith("vocabulary_"))).toBe(true);
    expect((await createJapaneseStudyQueue(db, "learner", { levelCode: "N5", focus: "weak" })).cards).toEqual([]);
    const expired = await answer(db, queue.cards[0].question.id);
    const clock = vi.spyOn(Date, "now").mockReturnValue(Date.parse(queue.cards[0].expiresAt) + 1);
    let fresh;
    try {
      await expect(submitJapaneseStudyReview(db, "learner", expired)).rejects.toMatchObject({ code: "PROMPT_EXPIRED" });
      expect(await db.userStudyCardState.count()).toBe(0);
      fresh = await createJapaneseStudyQueue(db, "learner", { levelCode: "N5", kind: "vocabulary", limit: 50 });
      expect(new Set(fresh.cards.map(card => card.question.id))).not.toContain(expired.promptId);
      const inputs = await Promise.all(fresh.cards.slice(0, 2).map(card => answer(db, card.question.id)));
      const wrongChoice = fresh.cards[1].question.choices.find(choice => choice.id !== inputs[1].choiceId)!.id;
      const results = await Promise.all([
        submitJapaneseStudyReview(db, "learner", { ...inputs[0], answerTimeMs: 3000 }),
        submitJapaneseStudyReview(db, "learner", { ...inputs[1], choiceId: wrongChoice, answerTimeMs: 8000 }),
      ]);
      expect(results[0]).toMatchObject({ correct: true, xpGained: 12, correctCount: 1, wrongCount: 0, averageAnswerMs: 3000 });
      expect(results[1]).toMatchObject({ correct: false, xpGained: 2, correctCount: 0, wrongCount: 1, averageAnswerMs: 8000, feedback: { written: expect.any(String) } });
      expect((await db.userStudyLevelProgress.findUniqueOrThrow({ where: { userId_levelId: { userId: "learner", levelId: "level-N5" } } })).xp).toBe(14);
      // One error is still learning under the shared classifier. Repeated
      // mistakes meet its existing minimum evidence for a weak-card session.
      expect((await createJapaneseStudyQueue(db, "learner", { levelCode: "N5", focus: "weak" })).cards).toEqual([]);
      await db.userStudyCardState.update({ where: { userId_cardId: { userId: "learner", cardId: fresh.cards[1].question.unitId } }, data: { wrongCount: 5, reps: 5 } });
      expect((await createJapaneseStudyQueue(db, "learner", { levelCode: "N5", focus: "weak" })).cards.map(card => card.question.unitId)).toEqual([fresh.cards[1].question.unitId]);
    } finally { clock.mockRestore(); }
    const remaining = fresh.cards[2];
    const input = await answer(db, remaining.question.id);
    await db.userStudyCardState.create({ data: { userId: "learner", cardId: remaining.question.unitId, correctCount: 1 } });
    await expect(submitJapaneseStudyReview(db, "learner", input)).rejects.toMatchObject({ code: "PROMPT_STALE" });
    await db.user.update({ where: { id: "learner" }, data: { learningLanguage: "ENGLISH" } });
    await expect(submitJapaneseStudyReview(db, "learner", input)).rejects.toMatchObject({ status: 403 });
  });
}, 30_000);
