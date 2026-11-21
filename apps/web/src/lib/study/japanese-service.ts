import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma, PrismaClient, StudyCard, StudyReviewPrompt, UserStudyLevelProgress } from "@/generated/prisma/client";
import type { JapaneseLevel } from "../japanese-content/corpus-audit";
import { sha256 } from "../japanese-content/digest";
import { canonicalJson } from "../canonical-json";
import { PrivateApiFailure } from "../private-api-error";
import { JAPANESE_REFERENCE_BANDS } from "../japanese-placement/public";
import { createJapanesePromptBank, gradeJapaneseStudyPrompt, type JapaneseStudyContent } from "./japanese-prompts";
import { readJapanesePromptCards, readJapanesePromptReferences } from "./japanese-runtime-source";
import { JAPANESE_REVIEW_PREVIEW_SIZE, japaneseStudyFeedbackSchema, japaneseStudyQuestionSchema, japaneseStudyResponseSchema, japaneseStudyResultSchema as resultSchema, japaneseStudyReviewPreviewSchema } from "./japanese-public";
import { getJapaneseStudyProgressionForTrack, readJapaneseStudyContext, readJapaneseProgressionState, japaneseProgressionFromState } from "./japanese-progression";
import { buildWeightedSessionQueue } from "./scheduler";
import { lockStudyLearner, saveStudyReviewProgress } from "./review-progress";
import { classifyPracticeBand, filterCardIdsByFocus, studyAccuracyPercent } from "./study-card-analytics";
import { replaceFlashcardPracticeState } from "./study-flashcard-stats";
import { readJapaneseDailyReview, recordJapaneseDailyAnswer, isCurrentJapaneseDailyPrompt, japaneseReviewCardScope, readJapaneseQuickReviewPool, type JapaneseDailyReceipt } from "./japanese-daily-review";
import { QUICK_REVIEW_DAILY_MAX } from "./quick-review-day";
import { selectQuickReviewCardIds } from "./quick-review-selection";
import { weightedSampleWithoutReplacement } from "./quiz";
import { studyMasteryPercent } from "./mastery";
import type { ReportQueuePreparation } from "./queue-preparation";
import { studyLevelIndex } from "./constants";
import { grantStudyAwards } from "@/lib/achievements/study-awards";

export class JapaneseStudyFailure extends PrivateApiFailure {}
const fail = (status: number, code: string): never => { throw new JapaneseStudyFailure(status, code); };
const queueSchema = z.object({
  levelCode: z.enum(JAPANESE_REFERENCE_BANDS), limit: z.number().int().min(1).max(50).default(24),
  focus: z.enum(["mixed", "weak", "mastered"]).default("mixed"),
  kind: z.enum(["mixed", "vocabulary", "kanji"]).default("mixed"),
}).strict();
const reviewSchema = japaneseStudyResponseSchema.extend({ answerTimeMs: z.number().int().min(0).max(300_000).optional(), dailyDayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).strict();
const answerSchema = z.object({ correctChoiceId: z.string().min(1), feedback: japaneseStudyFeedbackSchema }).strict();
type Progression = Awaited<ReturnType<typeof getJapaneseStudyProgressionForTrack>>;
type StudyDb = Parameters<typeof readJapaneseStudyContext>[0];
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const nowTime = () => new Date(Date.now());
const masteryScore = (mastery: { total: number; mastered: number }) => studyMasteryPercent(mastery.total, mastery.mastered);
const hashCard = (card: Pick<StudyCard, "id" | "deckId" | "kind" | "sortOrder" | "contentJson">) => sha256(canonicalJson({
  id: card.id, deckId: card.deckId, kind: card.kind, sortOrder: card.sortOrder, contentJson: card.contentJson,
}));
const reps = (state?: { correctCount: number; wrongCount: number } | null) => (state?.correctCount ?? 0) + (state?.wrongCount ?? 0);

async function requireContext(db: StudyDb, userId: string) {
  const context = await readJapaneseStudyContext(db, userId);
  if (context.status === "unauthorized") return fail(401, "UNAUTHORIZED");
  if (context.status === "forbidden") return fail(403, "JAPANESE_STUDENT_REQUIRED");
  if (context.status !== "available" || !context.track.catalogSnapshotId) return fail(503, "STUDY_UNAVAILABLE");
  return context.track;
}

async function saveMilestones(tx: Prisma.TransactionClient, userId: string, progression: Progression, now: Date, previous: readonly UserStudyLevelProgress[]) {
  const known = new Map(previous.map(row => [row.levelId, row]));
  const unlocked = progression.levels.filter(level => level.unlocked);
  const dataFor = (level: Progression["levels"][number]) => ({ masteryScore: masteryScore(level.mastery),
    ...(progression.mastered.includes(level.code as JapaneseLevel) ? { completedAt: now } : {}) });
  const missing = unlocked.filter(level => !known.has(level.id));
  if (missing.length) await tx.userStudyLevelProgress.createMany({ data: missing.map(level => ({ userId, levelId: level.id, ...dataFor(level) })) });
  for (const level of unlocked) {
    const row = known.get(level.id), data = dataFor(level);
    if (row && (row.masteryScore !== data.masteryScore || (!row.completedAt && data.completedAt))) {
      await tx.userStudyLevelProgress.update({ where: { id: row.id }, data: { ...data, completedAt: row.completedAt ?? data.completedAt } });
    }
  }
}

/** Read-only: opening an overview never creates progress. */
export async function getJapaneseStudyOverview(db: PrismaClient, userId: string) {
  const track = await requireContext(db, userId);
  return getJapaneseStudyProgressionForTrack(db, userId, track);
}


type Track = Awaited<ReturnType<typeof requireContext>>;
type PromptCard = Pick<StudyCard, "id" | "kind" | "contentJson"> & { deck: { levelId: string } };
function promptContent(card: PromptCard, track: Track) {
  // The compiler validates the complete content once, after checking its row binding.
  const content = card.contentJson as unknown as JapaneseStudyContent | null;
  const level = track.levels.find(level => level.id === card.deck.levelId);
  if (content?.unit?.id !== card.id || content.unit.level?.code !== level?.levelCode || card.kind !== (content.unit.kind === "kanji" ? "JAPANESE_KANJI" : "JAPANESE_VOCABULARY")) return fail(503, "STUDY_UNAVAILABLE");
  return content;
}

async function preparePromptBank(db: PrismaClient, tx: Prisma.TransactionClient, track: Track, ids: string[], levelIds: string[]) {
  const cards = await readJapanesePromptCards(tx, track.id, ids, levelIds);
  if (ids.some(id => !cards.some(card => card.id === id))) return fail(503, "STUDY_UNAVAILABLE");
  const contents = cards.map(card => promptContent(card, track));
  const references = await readJapanesePromptReferences(db, tx, track.catalogSnapshotId!, contents);
  const bank = createJapanesePromptBank(contents, references);
  return { cards, bank, snapshot: { id: track.catalogSnapshotId! } };
}
type PreparedBank = Awaited<ReturnType<typeof preparePromptBank>>;

/** Show the learner a few published cards without issuing prompts or touching study progress. */
export async function getJapaneseStudyReviewPreview(db: PrismaClient, userId: string) {
  return db.$transaction(async tx => {
    const track = await requireContext(tx, userId);
    const progression = await getJapaneseStudyProgressionForTrack(tx, userId, track);
    const unlocked = progression.levels.filter(level => level.unlocked && level.mastery.total > 0);
    const practiceLevel = unlocked.at(-1);
    if (!practiceLevel) return fail(503, "STUDY_UNAVAILABLE");
    const levelIds = unlocked.map(level => level.id);
    const scope = japaneseReviewCardScope(levelIds);
    const pool = await readJapaneseQuickReviewPool(tx, userId, levelIds);
    const ids = selectQuickReviewCardIds(pool, JAPANESE_REVIEW_PREVIEW_SIZE);
    const remaining = JAPANESE_REVIEW_PREVIEW_SIZE - ids.length;
    if (remaining > 0) {
      const available = await tx.studyCard.findMany({ where: { ...scope, id: { notIn: ids } }, select: { id: true, deck: { select: { levelId: true } } } });
      const atLevel = available.filter(card => card.deck.levelId === practiceLevel.id);
      ids.push(...weightedSampleWithoutReplacement(atLevel.length >= remaining ? atLevel : available, () => 1, remaining).map(card => card.id));
    }
    const cards = await tx.studyCard.findMany({ where: { ...scope, id: { in: ids } }, select: { id: true, kind: true, contentJson: true, deck: { select: { levelId: true } } } });
    const contents = cards.map(card => promptContent(card, track));
    const references = await readJapanesePromptReferences(db, tx, track.catalogSnapshotId!, contents);
    const bank = createJapanesePromptBank(contents, references);
    const byId = new Map(cards.map(card => [card.id, card]));
    const weakIds = new Set(pool.filter(state => classifyPracticeBand(state) === "weak").map(state => state.cardId));
    const firstWeak = ids.find(id => weakIds.has(id));
    const weakLevel = unlocked.find(level => firstWeak && byId.get(firstWeak)?.deck.levelId === level.id)
      ?? unlocked.findLast(level => level.practice.weakCount > 0);
    return japaneseStudyReviewPreviewSchema.parse({
      cards: ids.map(id => ({ id, feedback: bank.feedback(id, progression.unlocked.at(-1)!) })),
      level: (weakLevel ?? practiceLevel).code,
      focus: weakLevel ? "weak" : "mixed",
    });
  }, { isolationLevel: "RepeatableRead" });
}

async function issueQuestions(tx: Prisma.TransactionClient, userId: string, selected: PreparedBank["cards"], stateByCard: ReadonlyMap<string, { correctCount: number; wrongCount: number }>, prepared: PreparedBank, studyBand: JapaneseLevel, now: Date, report?: ReportQueuePreparation) {
  const { bank, snapshot } = prepared;
  const revisions = selected.map(card => {
    const baseReps = reps(stateByCard.get(card.id));
    return { card, baseReps, activeKey: sha256(canonicalJson({ userId, cardId: card.id, snapshotId: snapshot.id, baseReps })), contentSha256: hashCard(card) };
  });
  const existing = await tx.studyReviewPrompt.findMany({ where: { activeKey: { in: revisions.map(row => row.activeKey) } } });
  const byKey = new Map(existing.map(row => [row.activeKey, row]));
  const stale = existing.filter(prompt => {
    const revision = revisions.find(row => row.activeKey === prompt.activeKey)!;
    return prompt.expiresAt <= now || prompt.contentSha256 !== revision.contentSha256 || prompt.studyBand !== studyBand;
  });
  if (stale.length) await tx.studyReviewPrompt.updateMany({ where: { id: { in: stale.map(row => row.id) } }, data: { activeKey: null } });
  for (const row of stale) byKey.delete(row.activeKey);
  const created: Prisma.StudyReviewPromptCreateManyInput[] = [];
  const issued = revisions.map(({ card, baseReps, activeKey, contentSha256 }, index) => {
    let prompt: Pick<StudyReviewPrompt, "questionJson" | "expiresAt"> | undefined = byKey.get(activeKey);
    if (!prompt) {
      const variants = bank.members(card.id, studyBand).flatMap(memberId => bank.tasks(card.id, memberId, studyBand).map(task => ({ memberId, task })));
      const variant = variants[baseReps % variants.length];
      if (!variant) return fail(503, "STUDY_UNAVAILABLE");
      const compiled = bank.create(card.id, { ...variant, studyBand, seed: randomUUID() });
      const row = {
        id: compiled.question.id, userId, cardId: card.id, catalogSnapshotId: snapshot.id, contentSha256,
        baseReps, studyBand, activeKey, questionJson: json(compiled.question),
        answerJson: json({ correctChoiceId: compiled.correctChoiceId, feedback: compiled.feedback }),
        issuedAt: now, expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      };
      created.push(row);
      prompt = { questionJson: row.questionJson as Prisma.JsonValue, expiresAt: row.expiresAt };
    }
    const issued = { question: japaneseStudyQuestionSchema.parse(prompt.questionJson), expiresAt: prompt.expiresAt.toISOString() };
    report?.({ completed: index + 2, total: selected.length + 2 });
    return issued;
  });
  if (created.length) await tx.studyReviewPrompt.createMany({ data: created });
  return issued;
}
/** One active, server-owned question per canonical unit and performance revision. */
export async function createJapaneseStudyQueue(db: PrismaClient, userId: string, raw: unknown, report?: ReportQueuePreparation) {
  const parsed = queueSchema.safeParse(raw);
  if (!parsed.success) return fail(400, "INVALID_QUEUE");
  const { levelCode, limit, focus, kind } = parsed.data;
  return db.$transaction(async tx => {
    await lockStudyLearner(tx, userId);
    const track = await requireContext(tx, userId);
    const progressionState = await readJapaneseProgressionState(tx, userId, track);
    const progression = japaneseProgressionFromState(track, progressionState);
    if (!progression.unlocked.includes(levelCode)) return fail(403, "LEVEL_LOCKED");
    const studyBand = progression.unlocked.at(-1)!;
    const level = track.levels.find(level => level.levelCode === levelCode)!;
    const candidates = await tx.studyCard.findMany({
      where: { deck: { levelId: level.id }, ...(kind === "mixed" ? {} : { kind: kind === "kanji" ? "JAPANESE_KANJI" : "JAPANESE_VOCABULARY" }) },
      select: { id: true },
    });
    const states = await tx.userStudyCardState.findMany({ where: { userId, cardId: { in: candidates.map(card => card.id) } } });
    const stateByCard = new Map(states.map(state => [state.cardId, state]));
    const focused = new Set(filterCardIdsByFocus(candidates, stateByCard, focus));
    const now = nowTime();
    const selected = buildWeightedSessionQueue(candidates.filter(card => focused.has(card.id)), stateByCard, limit, now, Math.random, { allowRepeats: false });
    report?.({ completed: 0, total: selected.length + 2 });
    const prepared = await preparePromptBank(db, tx, track, selected.map(card => card.id), progression.levels.filter(level => level.unlocked).map(level => level.id));
    report?.({ completed: 1, total: selected.length + 2 });
    const byId = new Map(prepared.cards.map(card => [card.id, card]));
    const issued = await issueQuestions(tx, userId, selected.map(card => byId.get(card.id)!), stateByCard, prepared, studyBand, now, report);
    await saveMilestones(tx, userId, progression, now, progressionState.progress);
    return { levelCode, cards: issued };
  }, { timeout: 30_000 });
}

/** Grade and save once; identical retries return the original complete result. */
export async function submitJapaneseStudyReview(db: PrismaClient, userId: string, raw: unknown) {
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) return fail(400, "INVALID_REVIEW");
  const { promptId, choiceId, answerTimeMs, dailyDayKey } = parsed.data;
  return db.$transaction(async tx => {
    await lockStudyLearner(tx, userId);
    const track = await requireContext(tx, userId);
    const prompt = await tx.studyReviewPrompt.findFirst({ where: { id: promptId, userId } });
    if (!prompt) return fail(404, "PROMPT_NOT_FOUND");
    const now = nowTime();
    if (dailyDayKey && !await isCurrentJapaneseDailyPrompt(tx, userId, prompt.cardId, promptId, dailyDayKey, now)) return fail(409, "DAILY_REVIEW_CHANGED");
    const card = await tx.studyCard.findUnique({ where: { id: prompt.cardId }, include: { deck: { include: { level: true } } } });
    const progressionState = await readJapaneseProgressionState(tx, userId, track);
    const progression = japaneseProgressionFromState(track, progressionState);
    if (!card || card.deck.level.trackId !== track.id || !progression.unlocked.includes(card.deck.level.levelCode as JapaneseLevel) ||
      prompt.catalogSnapshotId !== track.catalogSnapshotId || prompt.contentSha256 !== hashCard(card) ||
      studyLevelIndex(prompt.studyBand, "JAPANESE") > studyLevelIndex(progression.unlocked.at(-1)!, "JAPANESE")) return fail(409, "PROMPT_STALE");
    if (prompt.answeredAt) {
      if (prompt.choiceId !== choiceId) return fail(409, "REVIEW_CONFLICT");
      return resultSchema.parse(prompt.resultJson);
    }
    if (prompt.expiresAt <= now) return fail(409, "PROMPT_EXPIRED");
    const previous = await tx.userStudyCardState.findUnique({ where: { userId_cardId: { userId, cardId: card.id } } });
    if (!prompt.activeKey || prompt.baseReps !== reps(previous)) return fail(409, "PROMPT_STALE");
    const compiled = { question: japaneseStudyQuestionSchema.parse(prompt.questionJson), ...answerSchema.parse(prompt.answerJson) };
    const graded = gradeJapaneseStudyPrompt(compiled, { promptId, choiceId });
    if (graded.status !== "graded") return fail(400, "INVALID_REVIEW");
    const saved = await saveStudyReviewProgress(tx, { userId, cardId: card.id, levelId: card.deck.levelId, correct: graded.correct, now, answerTimeMs }, { previous });
    progressionState.practice.set(card.deck.levelId, replaceFlashcardPracticeState(progressionState.practice.get(card.deck.levelId)!, previous, saved.state));
    progressionState.progress = [...progressionState.progress.filter(row => row.levelId !== card.deck.levelId), saved.progress];
    const after = japaneseProgressionFromState(track, progressionState);
    await saveMilestones(tx, userId, after, now, progressionState.progress);
    const level = after.levels.find(level => level.id === card.deck.levelId)!;
    const totalStudyXp = progressionState.progress.reduce((sum, row) => sum + row.xp, 0);
    const newCardTotal = saved.firstAnswer ? after.levels.reduce((sum, { practice }) =>
      sum + practice.learningCount + practice.weakCount + practice.masteredCount, 0) : undefined;
    const awards = await grantStudyAwards(tx, { userId, learningLanguage: "JAPANESE" }, {
      newCardTotal, totalXp: totalStudyXp, xpGained: saved.xpGained,
      firstLevelCompleted: progression.completed.length === 0 && after.completed.length > 0,
    });
    const result = resultSchema.parse({
      promptId, correct: graded.correct, feedback: graded.feedback, xpGained: saved.xpGained, levelXp: saved.progress.xp,
      totalStudyXp, ...(awards.length ? { awards } : {}),
      masteryScore: masteryScore(level.mastery),
      correctCount: saved.state.correctCount, wrongCount: saved.state.wrongCount, streakCorrect: saved.state.streakCorrect,
      accuracyPercent: studyAccuracyPercent(saved.state.correctCount, saved.state.wrongCount), averageAnswerMs: saved.state.averageAnswerMs,
      practiceBand: classifyPracticeBand(saved.state), unlocked: after.unlocked, completed: after.completed,
    });
    await recordJapaneseDailyAnswer(tx, { userId, cardId: card.id, promptId, correct: result.correct, xp: result.xpGained, now });
    await tx.studyReviewPrompt.update({ where: { id: promptId }, data: { answeredAt: now, choiceId, resultJson: json(result), activeKey: null } });
    return result;
  }, { timeout: 30_000 });
}

/** Up to five previously correct, authorized cards, fixed for the current UTC day. */
export async function createJapaneseQuickReviewQueue(db: PrismaClient, userId: string, raw: unknown, report?: ReportQueuePreparation) {
  if (!z.object({}).strict().safeParse(raw).success) return fail(400, "INVALID_QUICK_REVIEW");
  return db.$transaction(async tx => {
    await lockStudyLearner(tx, userId);
    const track = await requireContext(tx, userId);
    const progressionState = await readJapaneseProgressionState(tx, userId, track);
    const progression = japaneseProgressionFromState(track, progressionState);
    const now = nowTime();
    let daily = await readJapaneseDailyReview(tx, userId, progression, now);
    if (!daily.row && daily.pool.length) {
      const ids = selectQuickReviewCardIds(daily.pool, QUICK_REVIEW_DAILY_MAX);
      await tx.studyQuickReviewDay.create({ data: { userId, learningLanguage: "JAPANESE", dayKey: daily.status.dayKey, cardIds: ids, interactions: [] } });
      daily = await readJapaneseDailyReview(tx, userId, progression, now);
    }
    if (!daily.row) return { ...daily.status, cards: [] };
    const pending = daily.ids.filter(id => !daily.receipts.some(receipt => receipt.cardId === id && receipt.result));
    if (!pending.length) return { ...daily.status, cards: [] };
    report?.({ completed: 0, total: pending.length + 2 });
    const prepared = await preparePromptBank(db, tx, track, pending, progression.levels.filter(level => level.unlocked).map(level => level.id));
    report?.({ completed: 1, total: pending.length + 2 });
    const byId = new Map(prepared.cards.map(card => [card.id, card]));
    const selected = pending.map(id => byId.get(id)!);
    const issued = await issueQuestions(tx, userId, selected, new Map(daily.pool.map(state => [state.cardId, state])), prepared, progression.unlocked.at(-1)!, now, report);
    const receipts: JapaneseDailyReceipt[] = daily.ids.map(cardId => {
      const previous = daily.receipts.find(receipt => receipt.cardId === cardId);
      if (previous?.result) return previous;
      return { cardId, promptId: issued.find(card => card.question.unitId === cardId)!.question.id };
    });
    await tx.studyQuickReviewDay.update({ where: { id: daily.row.id }, data: { interactions: receipts as unknown as Prisma.InputJsonValue } });
    await saveMilestones(tx, userId, progression, now, progressionState.progress);
    return { ...daily.status, cards: issued };
  }, { timeout: 30_000 });
}
