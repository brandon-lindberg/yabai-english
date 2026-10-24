import { expect, test, vi } from "vitest";
import { withIsolatedPostgres } from "../../test/isolated-postgres";
import { seedJapaneseStudy as seed, japaneseStudyAnswer as answer } from "../../test/japanese-study-db-fixture";
import { createJapaneseQuickReviewQueue, submitJapaneseStudyReview } from "@/lib/study/japanese-service";
import { getJapaneseDashboardStudy } from "@/lib/dashboard/japanese-study";
import { utcCalendarDayKey } from "@/lib/study/quick-review-day";

const migration = "20261023030000_study_review_prompts";
const enabled = !!process.env.MIRROR_TEST_DATABASE_URL;

test.runIf(enabled)("Japanese daily review is stable, scoped and saved once through the existing automatic grader", async () => {
  await withIsolatedPostgres(migration, async ({ db, applyMigration }) => {
    await applyMigration(); await seed(db);
    const n5 = await db.studyCard.findMany({ where: { deckId: "deck-N5" } });
    await db.userStudyCardState.createMany({ data: [...n5, { id: "word-0" }].map(card => ({ userId: "learner", cardId: card.id, correctCount: 1, reps: 1 })) });
    await db.studyQuickReviewDay.create({ data: { id: "english-day", userId: "learner", learningLanguage: "ENGLISH", dayKey: utcCalendarDayKey(), cardIds: ["legacy-English-card"], interactions: [] } });
    const before = await db.studyQuickReviewDay.findUniqueOrThrow({ where: { id: "english-day" } });
    const summary = await getJapaneseDashboardStudy(db, "learner");
    expect(summary).toMatchObject({ available: true, quickReview: { total: 5, answered: 0 } });
    expect(await db.studyReviewPrompt.count()).toBe(0);
    expect(await db.studyQuickReviewDay.count({ where: { learningLanguage: "JAPANESE" } })).toBe(0);
    const [first, same] = await Promise.all([createJapaneseQuickReviewQueue(db, "learner", {}), createJapaneseQuickReviewQueue(db, "learner", {})]);
    expect(first.cards).toHaveLength(5);
    expect(first.cards.map(card => card.question.id)).toEqual(same.cards.map(card => card.question.id));
    expect(new Set(first.cards.map(card => card.question.unitId)).size).toBe(5);
    expect(first.cards.every(card => card.question.level.introduction === "N5")).toBe(true);
    expect(JSON.stringify(first)).not.toMatch(/correctChoiceId|answerJson|feedback|legacy-English/);
    const input = await answer(db, first.cards[0].question.id);
    await Promise.all([submitJapaneseStudyReview(db, "learner", input), submitJapaneseStudyReview(db, "learner", input)]);
    const resumed = await createJapaneseQuickReviewQueue(db, "learner", {});
    expect(resumed).toMatchObject({ total: 5, answered: 1, correct: 1, wrong: 0, xp: 12 });
    expect(resumed.cards).toHaveLength(4);
    for (const card of resumed.cards) {
      const correct = await answer(db, card.question.id);
      const wrong = card.question.choices.find(choice => choice.id !== correct.choiceId)!.id;
      await submitJapaneseStudyReview(db, "learner", { ...correct, choiceId: wrong });
    }
    expect(await createJapaneseQuickReviewQueue(db, "learner", {})).toMatchObject({ total: 5, answered: 5, correct: 1, wrong: 4, xp: 20, cards: [] });
    const completed = await getJapaneseDashboardStudy(db, "learner");
    expect(completed).toMatchObject({ available: true, quickReview: { total: 5, answered: 5, xp: 20 }, trackPractice: { totalAttempts: 15, totalCorrect: 11 } });
    expect(await db.studyQuickReviewDay.findUnique({ where: { id: "english-day" } })).toEqual(before);
  });
}, 30_000);

test.runIf(enabled)("dashboard summaries use Japanese XP, latest Japanese study, and fresh publication/account checks", async () => {
  await withIsolatedPostgres(migration, async ({ db, applyMigration }) => {
    await applyMigration(); await seed(db);
    await db.studentProfile.create({ data: { userId: "learner", placedLevel: "ADVANCED", placedSubLevel: 3 } });
    await db.userStudyLevelProgress.create({ data: { userId: "learner", levelId: "level-N5", xp: 96, lastStudiedAt: new Date() } });
    await db.userStudyCardState.create({ data: { userId: "learner", cardId: "extra-1", correctCount: 5, wrongCount: 2, reps: 7, averageAnswerMs: 3000, latencySampleCount: 7 } });
    const summary = await getJapaneseDashboardStudy(db, "learner");
    expect(summary).toMatchObject({ available: true, resume: { levelCode: "N5", cardsTouched: 1, cardsTotal: 9 }, overview: { rpg: { totalStudyXp: 96 } }, trackPractice: { totalAttempts: 7, avgAnswerMs: 3000 } });
    expect(JSON.stringify(summary)).not.toContain("ADVANCED");
    for (const user of ["other", "english-user", "teacher", "hidden", "missing"]) {
      const result = await getJapaneseDashboardStudy(db, user);
      if (user === "other") expect(result).toMatchObject({ available: true, resume: null, trackPractice: { totalAttempts: 0 } });
      else expect(result).toEqual({ available: false });
    }
    await db.studyTrack.update({ where: { id: "track" }, data: { publicationStatus: "DRAFT" } });
    expect(await getJapaneseDashboardStudy(db, "learner")).toEqual({ available: false });
    await expect(createJapaneseQuickReviewQueue(db, "learner", {})).rejects.toMatchObject({ status: 503 });
    expect(await db.studyReviewPrompt.count()).toBe(0);
    expect(await db.studyQuickReviewDay.count()).toBe(0);
  });
}, 30_000);

test.runIf(enabled)("daily credit rolls back with the answer and new UTC days receive a separate selection", async () => {
  await withIsolatedPostgres(migration, async ({ db, client, applyMigration }) => {
    await applyMigration(); await seed(db);
    await db.userStudyCardState.create({ data: { userId: "learner", cardId: "extra-1", correctCount: 1, reps: 1 } });
    const first = await createJapaneseQuickReviewQueue(db, "learner", {});
    const input = await answer(db, first.cards[0].question.id);
    await client.query(`CREATE FUNCTION fail_daily_answer() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic answer failure'; END; $$; CREATE TRIGGER fail_daily_answer BEFORE UPDATE ON "StudyReviewPrompt" FOR EACH ROW EXECUTE FUNCTION fail_daily_answer();`);
    await expect(submitJapaneseStudyReview(db, "learner", input)).rejects.toThrow();
    expect(await createJapaneseQuickReviewQueue(db, "learner", {})).toMatchObject({ answered: 0, xp: 0 });
    expect((await db.userStudyCardState.findUniqueOrThrow({ where: { userId_cardId: { userId: "learner", cardId: "extra-1" } } })).correctCount).toBe(1);
    await client.query('DROP TRIGGER fail_daily_answer ON "StudyReviewPrompt"');
    await submitJapaneseStudyReview(db, "learner", input);
    const nextDay = Date.parse(`${first.dayKey}T00:00:00.000Z`) + 86_400_001;
    const clock = vi.spyOn(Date, "now").mockReturnValue(nextDay);
    try {
      const next = await createJapaneseQuickReviewQueue(db, "learner", {});
      expect(next.dayKey).not.toBe(first.dayKey);
      expect(next).toMatchObject({ total: 1, answered: 0, xp: 0 });
      expect(next.cards[0].question.id).not.toBe(input.promptId);
      expect(await db.studyQuickReviewDay.count({ where: { learningLanguage: "JAPANESE" } })).toBe(2);
    } finally { clock.mockRestore(); }
  });
}, 30_000);

test.runIf(enabled)("denies forged daily inputs and filters foreign cached cards before issuing any questions", async () => {
  await withIsolatedPostgres(migration, async ({ db, applyMigration }) => {
    await applyMigration(); await seed(db);
    for (const user of ["missing", "english-user", "teacher", "hidden"]) await expect(createJapaneseQuickReviewQueue(db, user, {})).rejects.toMatchObject({ status: user === "missing" ? 401 : 403 });
    await expect(createJapaneseQuickReviewQueue(db, "learner", { dayKey: "2030-01-01", userId: "other" })).rejects.toMatchObject({ status: 400 });
    expect(await createJapaneseQuickReviewQueue(db, "learner", {})).toMatchObject({ cards: [], total: 0 });
    await db.studyQuickReviewDay.create({ data: { userId: "learner", learningLanguage: "JAPANESE", dayKey: utcCalendarDayKey(), cardIds: ["word-0", "unknown", "extra-1"], interactions: [] } });
    await db.userStudyCardState.createMany({ data: ["extra-1", "word-0"].map(cardId => ({ userId: "learner", cardId, correctCount: 1, reps: 1 })) });
    const queue = await createJapaneseQuickReviewQueue(db, "learner", {});
    expect(queue.cards.map(card => card.question.unitId)).toEqual(["extra-1"]);
  });
}, 30_000);

test.runIf(enabled)("a quick-review answer from an earlier UTC day is refreshed before awarding any progress", async () => {
  await withIsolatedPostgres(migration, async ({ db, applyMigration }) => {
    await applyMigration(); await seed(db);
    await db.userStudyCardState.create({ data: { userId: "learner", cardId: "extra-1", correctCount: 1, reps: 1 } });
    const first = await createJapaneseQuickReviewQueue(db, "learner", {});
    const input = await answer(db, first.cards[0].question.id);
    const clock = vi.spyOn(Date, "now").mockReturnValue(Date.parse(`${first.dayKey}T00:00:00.000Z`) + 86_400_001);
    try {
      await expect(submitJapaneseStudyReview(db, "learner", { ...input, dailyDayKey: first.dayKey })).rejects.toMatchObject({ status: 409, code: "DAILY_REVIEW_CHANGED" });
      expect((await db.userStudyCardState.findUniqueOrThrow({ where: { userId_cardId: { userId: "learner", cardId: "extra-1" } } })).correctCount).toBe(1);
      const next = await createJapaneseQuickReviewQueue(db, "learner", {});
      const current = await answer(db, next.cards[0].question.id);
      expect(await submitJapaneseStudyReview(db, "learner", { ...current, dailyDayKey: next.dayKey })).toMatchObject({ correct: true, xpGained: 12 });
      expect(await createJapaneseQuickReviewQueue(db, "learner", {})).toMatchObject({ answered: 1, cards: [] });
    } finally { clock.mockRestore(); }
  });
}, 30_000);
