import { access } from "node:fs/promises";
import { expect, test } from "vitest";
import { withIsolatedPostgres } from "../../test/isolated-postgres";
import { japaneseStudyFixture } from "../../test/japanese-study-fixture";
import { importJapaneseStudyDraft, prepareJapaneseStudyImport } from "@/lib/study/japanese-import";
import { getOrCreateQuickReviewCards, applyQuickReviewOutcome, utcCalendarDayKey } from "@/lib/study/quick-review";
import { getTotalStudyXpForTrack, getStudyTrackOverview } from "@/lib/study/get-overview";
import { isStudyLevelUnlocked } from "@/lib/study/access";
import { loadJapaneseStudyArtifacts } from "@/lib/japanese-content/study-artifacts";
import { createJapaneseStudyQueue, submitJapaneseStudyReview } from "@/lib/study/japanese-service";
import { saveStudyReviewProgress } from "@/lib/study/review-progress";
import { nextStudyReviewState } from "@/lib/study/scheduler";
import { getJapaneseStudyProgression } from "@/lib/study/japanese-progression";
import { createJapanesePromptBank } from "@/lib/study/japanese-prompts";
import { publishJapaneseBank } from "@/lib/japanese-placement/service";
import { approvedBank } from "@/lib/japanese-placement/__tests__/fixtures";
import { JAPANESE_PLACEMENT_DOMAINS } from "@/lib/japanese-placement/public";

const migration = "20261023020000_study_subject_persistence";

test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("English quick review selects and replaces with difficult cards in priority order", async () => {
  await withIsolatedPostgres(migration, async ({ db, applyMigration }) => {
    await applyMigration();
    await db.user.create({ data: { id: "learner", role: "STUDENT" } });
    await db.studyTrack.create({ data: { slug: "english-flashcards", titleJa: "英語", titleEn: "English", levels: { create: {
      levelCode: "BEGINNER_1", titleJa: "初級", titleEn: "Beginner", decks: { create: { id: "deck", titleJa: "語彙", titleEn: "Vocabulary" } },
    } } } });
    await db.studyCard.createMany({ data: Array.from({ length: 8 }, (_, index) => ({
      id: `card-${index}`, deckId: "deck", frontJa: index === 0 ? "___" : "猫", backEn: "cat",
    })) });
    await db.userStudyCardState.createMany({ data: Array.from({ length: 8 }, (_, index) => ({
      userId: "learner", cardId: `card-${index}`, correctCount: index < 2 ? 0 : 1,
      wrongCount: Math.max(0, 6 - index),
    })) });
    const selection = await getOrCreateQuickReviewCards(db, "learner");
    expect(selection.cards.map(card => card.id)).toEqual(["card-1", "card-2", "card-3", "card-4", "card-5"]);

    // A newly missed card is the first replacement, ahead of the remaining easy cards.
    await db.userStudyCardState.update({ where: { userId_cardId: { userId: "learner", cardId: "card-7" } }, data: { wrongCount: 1 } });
    const result = await applyQuickReviewOutcome(db, "learner", { dayKey: selection.dayKey, cardId: "card-1", outcome: "learned" });
    expect(result).toMatchObject({ ok: true, learnedToday: 1 });
    if (!result.ok) throw new Error("Expected a replacement");
    expect(result.cards.map(card => card.id)).toEqual(["card-7", "card-2", "card-3", "card-4", "card-5"]);
  });
}, 30_000);

// Explicit opt-in, disposable schema only. Application data is never seeded or changed.
test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("preserves English history, imports Japanese atomically and isolates real study queries", async () => {
  const fixture = japaneseStudyFixture();
  const hasCorpus = await access(".cache/japanese-content/study-v1.json").then(() => true, () => false);
  const { source, study } = hasCorpus ? await loadJapaneseStudyArtifacts(process.cwd()) : { source: fixture.source, study: fixture.build() };
  const plan = prepareJapaneseStudyImport(source, study);
  await withIsolatedPostgres(migration, async ({ client, db, applyMigration, verifyDatamodel }) => {
    const day = utcCalendarDayKey();
    await client.query(`
      INSERT INTO "User" (id, locale, role, "updatedAt") VALUES ('student', 'en', 'STUDENT', NOW());
      INSERT INTO "StudyTrack" (id, slug, "titleJa", "titleEn") VALUES ('english', 'english-flashcards', '英語', 'English');
      INSERT INTO "StudyLevel" (id, "trackId", "levelCode", "titleJa", "titleEn") VALUES ('level', 'english', 'BEGINNER_1', '初級', 'Beginner');
      INSERT INTO "StudyDeck" (id, "levelId", "titleJa", "titleEn") VALUES ('deck', 'level', '語彙', 'Vocabulary');
      INSERT INTO "StudyCard" (id, "deckId", "frontJa", "backEn") VALUES ('legacy-card', 'deck', '猫', 'cat');
      INSERT INTO "UserStudyLevelProgress" (id, "userId", "levelId", xp, "masteryScore") VALUES ('progress', 'student', 'level', 48, 80);
      INSERT INTO "UserStudyCardState" (id, "userId", "cardId", "correctCount", "streakCorrect", "dueAt", "updatedAt") VALUES ('state', 'student', 'legacy-card', 4, 4, NOW() + INTERVAL '1 day', NOW());
    `);
    await client.query('INSERT INTO "StudyQuickReviewDay" (id, "userId", "dayKey", "cardIds", interactions) VALUES ($1,$2,$3,$4,$5)', ["daily", "student", day, '["legacy-card"]', '[]']);
    const tables = ["StudyTrack", "StudyCard", "UserStudyLevelProgress", "UserStudyCardState", "StudyQuickReviewDay"];
    const before = [];
    for (const table of tables) before.push(await client.query(`SELECT * FROM "${table}"`));
    await applyMigration();
    await verifyDatamodel();
    for (const [i, table] of tables.entries()) {
      const after = (await client.query(`SELECT * FROM "${table}"`)).rows;
      const extra = table === "StudyTrack" ? { learningLanguage: "ENGLISH", publicationStatus: "PUBLISHED", catalogSnapshotId: null }
        : table === "StudyCard" ? { kind: "ENGLISH_EXERCISE", contentJson: null }
        : table === "StudyQuickReviewDay" ? { learningLanguage: "ENGLISH" } : {};
      expect(after).toEqual(before[i].rows.map(row => ({ ...row, ...extra })));
    }

    // A colliding legacy ID must roll the entire draft back, never overwrite it.
    await db.studyCard.create({ data: { id: plan.cards[0].id, deckId: "deck", frontJa: "Keep", backEn: "unchanged" } });
    await expect(importJapaneseStudyDraft(db, source, study)).rejects.toThrow();
    expect(await db.studyCatalogSnapshot.count()).toBe(0);
    expect(await db.studyTrack.count()).toBe(1);
    expect((await db.studyCard.findUniqueOrThrow({ where: { id: plan.cards[0].id } })).backEn).toBe("unchanged");
    await db.studyCard.delete({ where: { id: plan.cards[0].id } });

    expect(await importJapaneseStudyDraft(db, source, study)).toMatchObject({ imported: true, cards: hasCorpus ? 10291 : 2 });
    expect(await importJapaneseStudyDraft(db, source, study)).toMatchObject({ imported: false });
    await db.studyCard.update({ where: { id: plan.cards[0].id }, data: { frontJa: "unexpected change" } });
    await expect(importJapaneseStudyDraft(db, source, study)).rejects.toThrow(/drift/);
    await db.studyCard.update({ where: { id: plan.cards[0].id }, data: { frontJa: "" } });
    const imported = await db.studyCard.findMany({ where: { deck: { level: { trackId: plan.track.id } } }, orderBy: { sortOrder: "asc" } });
    expect(imported.map(card => ({ id: card.id, kind: card.kind, deckId: card.deckId, contentJson: card.contentJson })))
      .toEqual(plan.cards.map(card => ({ id: card.id, kind: card.kind, deckId: card.deckId, contentJson: card.contentJson })));
    expect((await db.studyCatalogSnapshot.findUniqueOrThrow({ where: { id: plan.snapshot.id } })).provenanceJson).toEqual(plan.snapshot.provenanceJson);
    expect(await getStudyTrackOverview(db, "student", "japanese-flashcards")).toBeNull();
    expect(await isStudyLevelUnlocked(db, "student", plan.track.id, "N5")).toBe(false);

    // One learner can retain independent progress for both subjects while switching intent.
    const jpCard = imported[0];
    await db.userStudyCardState.create({ data: { userId: "student", cardId: jpCard.id, ...nextStudyReviewState(null, true, new Date()) } });
    await db.userStudyLevelProgress.create({ data: { userId: "student", levelId: plan.levels[0].id, xp: 12 } });
    await db.user.update({ where: { id: "student" }, data: { learningLanguage: "JAPANESE" } });
    expect(await getTotalStudyXpForTrack(db, "student", "english")).toBe(48);
    expect(await getTotalStudyXpForTrack(db, "student", plan.track.id)).toBe(12);
    expect((await db.userStudyCardState.findUniqueOrThrow({ where: { id: "state" } })).correctCount).toBe(4);
    await db.studyQuickReviewDay.create({ data: { userId: "student", learningLanguage: "JAPANESE", dayKey: day, cardIds: [jpCard.id] } });
    expect(await db.studyQuickReviewDay.count({ where: { userId: "student", dayKey: day } })).toBe(2);
    expect((await getOrCreateQuickReviewCards(db, "student", "ENGLISH")).cards.map(card => card.id)).toEqual(["legacy-card"]);
    await db.studyQuickReviewDay.delete({ where: { id: "daily" } });
    // Exercise real pool filtering and concurrent first loads, not just a stored selection.
    const selections = await Promise.all([getOrCreateQuickReviewCards(db, "student", "ENGLISH"), getOrCreateQuickReviewCards(db, "student", "ENGLISH")]);
    expect(selections.map(selection => selection.cards.map(card => card.id))).toEqual([["legacy-card"], ["legacy-card"]]);
    const result = await applyQuickReviewOutcome(db, "student", { dayKey: day, cardId: "legacy-card", outcome: "learned" });
    expect(result).toMatchObject({ ok: true, cards: [], learnedToday: 1 });
    expect((await db.studyQuickReviewDay.findUniqueOrThrow({ where: { userId_learningLanguage_dayKey: { userId: "student", learningLanguage: "JAPANESE", dayKey: day } } })).cardIds).toEqual([jpCard.id]);
    await db.studyTrack.update({ where: { id: plan.track.id }, data: { publicationStatus: "PUBLISHED" } });
    await expect(importJapaneseStudyDraft(db, source, study)).rejects.toThrow(/published/);
    if (hasCorpus) {
      const queue = await createJapaneseStudyQueue(db, "student", { levelCode: "N5", limit: 24 });
      expect(queue.cards).toHaveLength(24);
      const prompt = await db.studyReviewPrompt.findUniqueOrThrow({ where: { id: queue.cards[0].question.id } });
      expect(await submitJapaneseStudyReview(db, "student", { promptId: prompt.id, choiceId: (prompt.answerJson as { correctChoiceId: string }).correctChoiceId })).toMatchObject({ correct: true, xpGained: 12 });
      expect(await getTotalStudyXpForTrack(db, "student", "english")).toBe(48);
    }
    // The same persistence helper used by the English review route reads inside
    // the learner lock, so simultaneous correct/wrong answers both survive.
    await Promise.all([true, false].map(correct => db.$transaction(tx => saveStudyReviewProgress(tx, {
      userId: "student", cardId: "legacy-card", levelId: "level", correct, now: new Date(),
    }))));
    expect(await db.userStudyCardState.findUnique({ where: { id: "state" } })).toMatchObject({ correctCount: 5, wrongCount: 1, reps: 6 });
    expect(await getTotalStudyXpForTrack(db, "student", "english")).toBe(62);
  });
}, 90_000);

test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("Japanese study reads its own placement, mastery and earned access without modifying assessment or English history", async () => {
  await withIsolatedPostgres(migration, async ({ db, applyMigration }) => {
    await applyMigration();
    await db.user.create({ data: { id: "japanese-student", role: "STUDENT", learningLanguage: "JAPANESE" } });
    await db.studentProfile.create({ data: { userId: "japanese-student", placedLevel: "ADVANCED", placedSubLevel: 3 } });
    const fixture = japaneseStudyFixture();
    const study = fixture.build();
    const plan = prepareJapaneseStudyImport(fixture.source, study);
    await importJapaneseStudyDraft(db, fixture.source, study);
    expect(await getJapaneseStudyProgression(db, "japanese-student")).toEqual({ available: false });
    // Published fixtures belong only to this disposable test schema.
    await db.studyTrack.update({ where: { id: plan.track.id }, data: { publicationStatus: "PUBLISHED" } });
    expect(await getJapaneseStudyProgression(db, "japanese-student")).toMatchObject({ available: true, unlocked: ["N5"], placementBand: null });
    await db.userStudyCardState.create({ data: { userId: "japanese-student", cardId: "kanji", correctCount: 1, streakCorrect: 1 } });
    expect(await getJapaneseStudyProgression(db, "japanese-student")).toMatchObject({ unlocked: ["N5"] });
    await db.userStudyCardState.update({ where: { userId_cardId: { userId: "japanese-student", cardId: "kanji" } }, data: { correctCount: 8, streakCorrect: 5 } });
    expect(await getJapaneseStudyProgression(db, "japanese-student")).toMatchObject({ unlocked: ["N5", "N4"], mastered: ["N5"] });

    const snapshot = await publishJapaneseBank(db, approvedBank());
    const at = new Date("2026-10-23T00:00:00Z");
    // Synthetic immutable result projections exercise the read boundary, not calibration.
    const result = (id: string, estimated: boolean) => ({ attemptId: id, completedAt: at.toISOString(),
      levelEstimate: estimated ? { status: "estimated", scope: "reading_writing", band: "N3", provisional: true, modelRange: { lower: "N4", upper: "N2" } }
        : { status: "insufficient_evidence", scope: "reading_writing", reason: "fixture" },
      domains: JAPANESE_PLACEMENT_DOMAINS.map(domain => ({ domain, planned: 1, answered: 1, correct: 1, incorrect: 0, notSure: 0, observation: "observed" })),
    });
    const earlier = await db.japanesePlacementAttempt.create({ data: { id: "completed-first", learnerId: "japanese-student", bankSnapshotId: snapshot.id, requestId: "00000000-0000-4000-8000-000000000091", schemaVersion: 2, scoringRevision: "synthetic-read-boundary", status: "COMPLETED", startedAt: at, finishedAt: at, result: result("completed-first", true) } });
    expect(await getJapaneseStudyProgression(db, "japanese-student")).toMatchObject({ placementBand: "N3", unlocked: ["N5", "N4", "N3"] });
    await db.userStudyLevelProgress.create({ data: { userId: "japanese-student", levelId: plan.levels.find(level => level.levelCode === "N3")!.id, xp: 12 } });
    await db.userStudyCardState.update({ where: { userId_cardId: { userId: "japanese-student", cardId: "kanji" } }, data: { wrongCount: 5, streakCorrect: 0 } });
    await db.japanesePlacementAttempt.create({ data: { id: "completed-latest", learnerId: "japanese-student", bankSnapshotId: snapshot.id, requestId: "00000000-0000-4000-8000-000000000092", schemaVersion: 2, scoringRevision: "synthetic-read-boundary", status: "COMPLETED", startedAt: at, finishedAt: new Date(at.getTime() + 1000), result: result("completed-latest", false) } });
    // An inconclusive attempt leaves the learner's most recent awarded level in effect.
    expect(await getJapaneseStudyProgression(db, "japanese-student")).toMatchObject({ placementBand: "N3", unlocked: ["N5", "N4", "N3"], mastered: [] });
    expect(await db.japanesePlacementAttempt.findUnique({ where: { id: earlier.id } })).toEqual(earlier);
    expect(await db.userStudyAssessmentAttempt.count()).toBe(0);
    expect(await db.studentProfile.findUnique({ where: { userId: "japanese-student" } })).toMatchObject({ placedLevel: "ADVANCED", placedSubLevel: 3 });

    const persisted = await db.studyCard.findMany({ where: { deck: { level: { trackId: plan.track.id } } } });
    const fileBank = createJapanesePromptBank(plan.cards.map(card => card.contentJson), fixture.source.reconciliation);
    const storedBank = createJapanesePromptBank(persisted.map(card => card.contentJson), fixture.source.reconciliation);
    expect(storedBank.tasks("word-0")).toEqual(fileBank.tasks("word-0"));
    await db.user.update({ where: { id: "japanese-student" }, data: { learningLanguage: "ENGLISH" } });
    expect(await getJapaneseStudyProgression(db, "japanese-student")).toEqual({ available: false });
  });
}, 30_000);
