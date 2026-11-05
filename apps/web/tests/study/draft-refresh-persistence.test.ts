import { expect, test } from "vitest";
import { withIsolatedPostgres } from "../../test/isolated-postgres";
import { japaneseStudyFixture } from "../../test/japanese-study-fixture";
import { canonicalJson } from "@/lib/canonical-json";
import { sha256 } from "@/lib/japanese-content/digest";
import { importJapaneseStudyDraft, inspectJapaneseStudyDraft, prepareJapaneseStudyImport, publishJapaneseStudyDraft } from "@/lib/study/japanese-import";
import { getJapaneseStudyOverview } from "@/lib/study/japanese-service";

const migration = "20261027010000_study_catalog_card_snapshots";
const optIn = test.runIf(process.env.MIRROR_TEST_DATABASE_URL);
const fixtureRevision = () => {
  const fixture = japaneseStudyFixture();
  const before = { source: structuredClone(fixture.source), study: fixture.build() };
  fixture.source.cards[0].content.meanings = ["contents; what is inside"];
  fixture.bind();
  return { before, after: { source: fixture.source, study: fixture.build() } };
};
const storedCards = (plan: ReturnType<typeof prepareJapaneseStudyImport>) => plan.cards.map(card => ({ ...card, exerciseJson: null }));
const guard = (plan: ReturnType<typeof prepareJapaneseStudyImport>) => ({
  expectedSnapshotId: plan.snapshot.id, expectedCardsSha256: sha256(canonicalJson(storedCards(plan))),
});

optIn("publishes only the pinned catalog, opens Japanese study and preserves all content/history and existing English progress", async () => {
  const { before } = fixtureRevision();
  const plan = prepareJapaneseStudyImport(before.source, before.study);
  await withIsolatedPostgres(migration, async ({ db, applyMigration }) => {
    await applyMigration();
    await importJapaneseStudyDraft(db, before.source, before.study);
    await db.user.createMany({ data: [{ id: "learner", role: "STUDENT", learningLanguage: "JAPANESE" }, { id: "english", role: "STUDENT" }] });
    await db.studyTrack.create({ data: { id: "english", slug: "english-flashcards", titleEn: "English", titleJa: "英語" } });
    await db.studyLevel.create({ data: { id: "english-level", trackId: "english", levelCode: "BEGINNER_1", titleEn: "Beginner", titleJa: "初級", sortOrder: 0 } });
    await db.userStudyLevelProgress.create({ data: { userId: "english", levelId: "english-level", xp: 120 } });
    const beforeRows = await Promise.all([db.studyCard.findMany(), db.studyCatalogSnapshot.findMany(), db.studyCatalogCardSnapshot.findMany(), db.userStudyLevelProgress.findMany()]);
    await expect(getJapaneseStudyOverview(db, "learner")).rejects.toMatchObject({ code: "STUDY_UNAVAILABLE" });
    expect(await publishJapaneseStudyDraft(db, before.source, before.study, guard(plan))).toMatchObject({ published: true, cards: 2, snapshotId: plan.snapshot.id });
    expect(await getJapaneseStudyOverview(db, "learner")).toMatchObject({ available: true, unlocked: ["N5"] });
    expect(await db.studyTrack.findUnique({ where: { id: plan.track.id } })).toMatchObject({ publicationStatus: "PUBLISHED", catalogSnapshotId: plan.snapshot.id });
    expect(await db.studyTrack.findUnique({ where: { id: "english" } })).toMatchObject({ publicationStatus: "PUBLISHED" });
    expect(await Promise.all([db.studyCard.findMany(), db.studyCatalogSnapshot.findMany(), db.studyCatalogCardSnapshot.findMany(), db.userStudyLevelProgress.findMany()])).toEqual(beforeRows);
    await db.userStudyCardState.create({ data: { userId: "learner", cardId: plan.cards[0].id, reps: 2 } });
    expect(await publishJapaneseStudyDraft(db, before.source, before.study, guard(plan))).toMatchObject({ published: false });
    expect(await inspectJapaneseStudyDraft(db, plan)).toMatchObject({ publicationStatus: "PUBLISHED", changedCards: 0 });
    expect(await db.userStudyCardState.findFirst()).toMatchObject({ reps: 2 });
    await expect(importJapaneseStudyDraft(db, before.source, before.study)).rejects.toThrow(/published/);
  });
}, 30_000);

optIn("publication rejects stale snapshot/content pins, changed cards, incomplete history and wrong subject without publishing", async () => {
  const { before } = fixtureRevision();
  const plan = prepareJapaneseStudyImport(before.source, before.study);
  await withIsolatedPostgres(migration, async ({ db, applyMigration, client }) => {
    await applyMigration(); await importJapaneseStudyDraft(db, before.source, before.study);
    await expect(publishJapaneseStudyDraft(db, before.source, before.study, { ...guard(plan), expectedSnapshotId: `ja-study:${"0".repeat(64)}` })).rejects.toThrow(/snapshot/i);
    await expect(publishJapaneseStudyDraft(db, before.source, before.study, { ...guard(plan), expectedCardsSha256: "0".repeat(64) })).rejects.toThrow(/digest|content/i);
    const card = await db.studyCard.findFirstOrThrow();
    await db.studyCard.update({ where: { id: card.id }, data: { contentJson: {} } });
    await expect(publishJapaneseStudyDraft(db, before.source, before.study, guard(plan))).rejects.toThrow(/drift|content/i);
    await db.studyCard.update({ where: { id: card.id }, data: { contentJson: card.contentJson! } });
    await db.studyTrack.update({ where: { id: plan.track.id }, data: { learningLanguage: "ENGLISH" } });
    await expect(publishJapaneseStudyDraft(db, before.source, before.study, guard(plan))).rejects.toThrow(/structure|Japanese/i);
    await db.studyTrack.update({ where: { id: plan.track.id }, data: { learningLanguage: "JAPANESE" } });
    // Reproduce a legacy archive missing rows without weakening immutable triggers.
    await client.query('TRUNCATE "StudyCatalogCardSnapshot"');
    await expect(publishJapaneseStudyDraft(db, before.source, before.study, guard(plan))).rejects.toThrow(/history/i);
    expect(await db.studyTrack.findUnique({ where: { id: plan.track.id } })).toMatchObject({ publicationStatus: "DRAFT" });
  });
}, 30_000);

optIn("publication rolls back database failure and safely resolves concurrent identical requests", async () => {
  const { before } = fixtureRevision();
  const plan = prepareJapaneseStudyImport(before.source, before.study);
  await withIsolatedPostgres(migration, async ({ db, applyMigration, client }) => {
    await applyMigration(); await importJapaneseStudyDraft(db, before.source, before.study);
    await client.query(`CREATE FUNCTION failPublication() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced publication failure'; END; $$;
      CREATE TRIGGER failPublication BEFORE UPDATE ON "StudyTrack" FOR EACH ROW EXECUTE FUNCTION failPublication()`);
    await expect(publishJapaneseStudyDraft(db, before.source, before.study, guard(plan))).rejects.toThrow(/forced publication failure/);
    expect(await db.studyTrack.findUnique({ where: { id: plan.track.id } })).toMatchObject({ publicationStatus: "DRAFT" });
    await client.query('DROP TRIGGER failPublication ON "StudyTrack"; DROP FUNCTION failPublication()');
    const outcomes = await Promise.allSettled([1, 2].map(() => publishJapaneseStudyDraft(db, before.source, before.study, guard(plan))));
    expect(outcomes.some(result => result.status === "fulfilled")).toBe(true);
    for (const result of outcomes) if (result.status === "rejected") expect(result.reason.code).toBe("P2034");
    expect(await publishJapaneseStudyDraft(db, before.source, before.study, guard(plan))).toMatchObject({ published: false });
    expect(await db.studyCatalogSnapshot.count()).toBe(1);
    expect(await db.studyCatalogCardSnapshot.count()).toBe(2);
  });
}, 30_000);

optIn("refreshes only the pinned unused draft, retaining both complete card revisions and idempotent retries", async () => {
  const { before, after } = fixtureRevision();
  const oldPlan = prepareJapaneseStudyImport(before.source, before.study);
  const newPlan = prepareJapaneseStudyImport(after.source, after.study);
  await withIsolatedPostgres(migration, async ({ db, applyMigration }) => {
    await applyMigration();
    // Reproduce the pre-history importer: provenance and active cards, no archive.
    await db.studyCatalogSnapshot.create({ data: oldPlan.snapshot });
    await db.studyTrack.create({ data: oldPlan.track });
    await db.studyLevel.createMany({ data: oldPlan.levels });
    await db.studyDeck.createMany({ data: oldPlan.decks });
    await db.studyCard.createMany({ data: oldPlan.cards });
    expect(await db.studyCatalogCardSnapshot.count()).toBe(0);
    const oldSnapshot = await db.studyCatalogSnapshot.findUniqueOrThrow({ where: { id: oldPlan.snapshot.id } });
    expect(await inspectJapaneseStudyDraft(db, newPlan)).toMatchObject({ snapshotId: oldPlan.snapshot.id, targetSnapshotId: newPlan.snapshot.id, changedCards: 1, cards: 2, cardsSha256: guard(oldPlan).expectedCardsSha256, learnerActivity: { cardStates: 0, levelProgress: 0, issuedPrompts: 0, dailyReviews: 0, assessmentAttempts: 0 } });
    expect(await db.studyCatalogCardSnapshot.count()).toBe(0);
    await expect(importJapaneseStudyDraft(db, after.source, after.study)).rejects.toThrow(/replace/);
    const result = await importJapaneseStudyDraft(db, after.source, after.study, guard(oldPlan));
    expect(result).toMatchObject({ refreshed: true, cards: 2, digest: newPlan.snapshot.studyCatalogSha256 });
    expect(await db.studyTrack.findUnique({ where: { id: oldPlan.track.id } })).toMatchObject({ publicationStatus: "DRAFT", catalogSnapshotId: newPlan.snapshot.id });
    expect(await db.studyCatalogSnapshot.findUnique({ where: { id: oldSnapshot.id } })).toEqual(oldSnapshot);
    expect(await db.studyCard.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, deckId: true, kind: true, frontJa: true, backEn: true, sortOrder: true, contentJson: true, exerciseJson: true } })).toEqual(storedCards(newPlan));
    const history = await db.studyCatalogCardSnapshot.findMany({ orderBy: [{ snapshotId: "asc" }, { cardId: "asc" }] });
    for (const plan of [oldPlan, newPlan]) expect(history.filter(row => row.snapshotId === plan.snapshot.id).map(row => row.cardJson))
      .toEqual([...storedCards(plan)].sort((a, b) => a.id.localeCompare(b.id)));
    expect(await db.studyCatalogSnapshot.findUnique({ where: { id: newPlan.snapshot.id } })).toMatchObject({ previousSnapshotId: oldPlan.snapshot.id });
    expect(await importJapaneseStudyDraft(db, after.source, after.study, guard(oldPlan))).toMatchObject({ refreshed: false, imported: false });
    expect(await importJapaneseStudyDraft(db, after.source, after.study)).toMatchObject({ imported: false });
    expect(await db.studyCatalogSnapshot.count()).toBe(2);
    expect(await db.studyCatalogCardSnapshot.count()).toBe(4);
    expect(await db.userStudyLevelProgress.count()).toBe(0);
    expect(await db.userStudyCardState.count()).toBe(0);
    expect(await db.studyReviewPrompt.count()).toBe(0);
  });
}, 30_000);

optIn("rejects stale pins, level/member changes, live learner state and publication without changing the draft", async () => {
  const { before, after } = fixtureRevision();
  const plan = prepareJapaneseStudyImport(before.source, before.study);
  await withIsolatedPostgres(migration, async ({ db, applyMigration }) => {
    await applyMigration();
    await importJapaneseStudyDraft(db, before.source, before.study);
    const snapshotBefore = await db.studyCatalogSnapshot.findMany();
    await expect(importJapaneseStudyDraft(db, after.source, after.study, { ...guard(plan), expectedSnapshotId: `ja-study:${"0".repeat(64)}` })).rejects.toThrow(/snapshot/i);
    await expect(importJapaneseStudyDraft(db, after.source, after.study, { ...guard(plan), expectedCardsSha256: "0".repeat(64) })).rejects.toThrow(/digest|content/i);
    const changedLevel = structuredClone(after.study);
    changedLevel.units[0].level.code = "N1";
    await expect(importJapaneseStudyDraft(db, after.source, changedLevel, guard(plan))).rejects.toThrow(/identity|level|structure/i);
    const changedMembers = structuredClone(after.study);
    changedMembers.units.find(unit => unit.id === "word-0")!.recordIds.reverse();
    await expect(importJapaneseStudyDraft(db, after.source, changedMembers, guard(plan))).rejects.toThrow(/identity|member|structure/i);

    await db.user.create({ data: { id: "learner", role: "STUDENT", learningLanguage: "JAPANESE" } });
    await db.userStudyCardState.create({ data: { userId: "learner", cardId: plan.cards[0].id } });
    await expect(importJapaneseStudyDraft(db, after.source, after.study, guard(plan))).rejects.toThrow(/activity|learner/i);
    await db.userStudyCardState.deleteMany();
    await db.userStudyLevelProgress.create({ data: { userId: "learner", levelId: plan.levels[0].id, xp: 12 } });
    await expect(importJapaneseStudyDraft(db, after.source, after.study, guard(plan))).rejects.toThrow(/activity|learner/i);
    await db.userStudyLevelProgress.deleteMany();
    await db.studyQuickReviewDay.create({ data: { userId: "learner", learningLanguage: "JAPANESE", dayKey: "2026-10-27", cardIds: [] } });
    await expect(importJapaneseStudyDraft(db, after.source, after.study, guard(plan))).rejects.toThrow(/activity|learner/i);
    await db.studyQuickReviewDay.deleteMany();
    const at = new Date("2026-10-27T01:00:00Z");
    await db.studyReviewPrompt.create({ data: { id: "issued", userId: "learner", cardId: plan.cards[0].id, catalogSnapshotId: plan.snapshot.id,
      contentSha256: "a".repeat(64), baseReps: 0, studyBand: "N5", questionJson: { id: "issued" }, answerJson: { correctChoiceId: "answer" }, issuedAt: at, expiresAt: new Date(at.getTime() + 60_000) } });
    await expect(importJapaneseStudyDraft(db, after.source, after.study, guard(plan))).rejects.toThrow(/activity|learner/i);
    await db.studyReviewPrompt.deleteMany();
    await db.studyAssessment.create({ data: { id: "exit", levelId: plan.levels[0].id, itemsJson: {} } });
    await db.userStudyAssessmentAttempt.create({ data: { userId: "learner", assessmentId: "exit", score: 50, answersJson: {}, passed: false } });
    await expect(importJapaneseStudyDraft(db, after.source, after.study, guard(plan))).rejects.toThrow(/activity|learner/i);
    await db.userStudyAssessmentAttempt.deleteMany();
    await db.studyTrack.update({ where: { id: plan.track.id }, data: { publicationStatus: "PUBLISHED" } });
    await expect(importJapaneseStudyDraft(db, after.source, after.study, guard(plan))).rejects.toThrow(/published/i);
    await db.studyTrack.update({ where: { id: plan.track.id }, data: { publicationStatus: "DRAFT" } });
    expect(await db.studyCatalogSnapshot.findMany()).toEqual(snapshotBefore);
    expect(await db.studyTrack.findUnique({ where: { id: plan.track.id } })).toMatchObject({ catalogSnapshotId: plan.snapshot.id });
  });
}, 30_000);

optIn("rolls back failed refreshes, rejects history edits and resolves competing identical refreshes safely", async () => {
  const { before, after } = fixtureRevision();
  const plan = prepareJapaneseStudyImport(before.source, before.study);
  const next = prepareJapaneseStudyImport(after.source, after.study);
  await withIsolatedPostgres(migration, async ({ client, db, applyMigration, verifyDatamodel }) => {
    await applyMigration();
    await verifyDatamodel();
    await importJapaneseStudyDraft(db, before.source, before.study);
    await client.query(`CREATE FUNCTION failDraftRefresh() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced refresh failure'; END; $$;
      CREATE TRIGGER failDraftRefresh BEFORE UPDATE ON "StudyCard" FOR EACH ROW EXECUTE FUNCTION failDraftRefresh()`);
    await expect(importJapaneseStudyDraft(db, after.source, after.study, guard(plan))).rejects.toThrow(/forced refresh failure/);
    expect(await db.studyCatalogSnapshot.count()).toBe(1);
    expect(await db.studyCatalogCardSnapshot.count()).toBe(2);
    expect(await inspectJapaneseStudyDraft(db)).toMatchObject({ snapshotId: plan.snapshot.id, cardsSha256: guard(plan).expectedCardsSha256 });
    await client.query('DROP TRIGGER failDraftRefresh ON "StudyCard"; DROP FUNCTION failDraftRefresh()');
    const attempts = await Promise.allSettled([1, 2].map(() => importJapaneseStudyDraft(db, after.source, after.study, guard(plan))));
    expect(attempts.filter(result => result.status === "fulfilled")).not.toHaveLength(0);
    for (const result of attempts) if (result.status === "rejected") expect(result.reason.code).toBe("P2034");
    expect(await importJapaneseStudyDraft(db, after.source, after.study, guard(plan))).toMatchObject({ refreshed: false });
    expect(await db.studyCatalogSnapshot.count()).toBe(2);
    expect(await db.studyCatalogCardSnapshot.count()).toBe(4);
    await expect(db.studyCatalogSnapshot.update({ where: { id: plan.snapshot.id }, data: { provenanceJson: {} } })).rejects.toThrow(/immutable/);
    await expect(db.studyCatalogCardSnapshot.update({ where: { snapshotId_cardId: { snapshotId: plan.snapshot.id, cardId: plan.cards[0].id } }, data: { cardJson: {} } })).rejects.toThrow(/immutable/);
    await expect(db.studyCatalogCardSnapshot.deleteMany({ where: { snapshotId: plan.snapshot.id } })).rejects.toThrow(/immutable/);
    await expect(db.studyCatalogSnapshot.delete({ where: { id: next.snapshot.id } })).rejects.toThrow(/immutable/);
  });
}, 30_000);
