import "server-only";
import {
  classifyPracticeBand,
  filterCardIdsByFocus,
  mcqDistractorCountForBand,
  type StudyCardPerformanceSlice,
} from "./study-card-analytics";
import { parseStudyCardExercise, queuePayloadFromExercise, shuffleTokensForQueue } from "./card-exercise";
import type { StudyQueueCard } from "./practice-queue-card";
import {
  buildFourOptions,
  extractFillBlankAnswer,
  MCQ_SHORT_FALLBACK_PHRASES,
  mcqCanonicalAnswer,
  mcqPoolPhraseWhenFragmentMode,
} from "./quiz";
import { buildWeightedSessionQueue } from "./scheduler";
import type { PrismaClient } from "@/generated/prisma/client";
import type { ReportQueuePreparation } from "./queue-preparation";
type StateRow = {
  dueAt: Date | null;
  correctCount: number;
  wrongCount: number;
  streakCorrect: number;
  averageAnswerMs: number | null;
  latencySampleCount: number;
};

function toPerformanceSlice(st: StateRow | undefined): StudyCardPerformanceSlice | undefined {
  if (!st) return undefined;
  return {
    correctCount: st.correctCount,
    wrongCount: st.wrongCount,
    streakCorrect: st.streakCorrect,
    averageAnswerMs: st.averageAnswerMs,
    latencySampleCount: st.latencySampleCount,
  };
}

/** Fetch full content only after the weighted scheduler has chosen this session. */
export async function prepareEnglishStudyQueue(prisma: Pick<PrismaClient, "studyCard" | "userStudyCardState">, userId: string, levelId: string,
  options: { limit: number; focus: "mixed" | "weak" | "mastered" }, report?: ReportQueuePreparation) {
  const cards = await prisma.studyCard.findMany({
    where: { kind: "ENGLISH_EXERCISE", deck: { levelId } },
    orderBy: [{ deck: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    select: { id: true },
  });

  if (cards.length === 0) {
    return ({
      levelId,
      cards: [],
      focus: options.focus,
    });
  }

  const states = await prisma.userStudyCardState.findMany({
    where: { userId, cardId: { in: cards.map((c) => c.id) } },
  });
  const stateByCard = new Map(
    states.map((s) => [
      s.cardId,
      {
        dueAt: s.dueAt,
        correctCount: s.correctCount,
        wrongCount: s.wrongCount,
        streakCorrect: s.streakCorrect,
        averageAnswerMs: s.averageAnswerMs,
        latencySampleCount: s.latencySampleCount,
      } satisfies StateRow,
    ]),
  );

  const perfMap = new Map<string, StudyCardPerformanceSlice | undefined>();
  for (const c of cards) {
    perfMap.set(c.id, toPerformanceSlice(stateByCard.get(c.id)));
  }

  const focus = options.focus;
  const pool =
    focus === "mixed"
      ? cards
      : (() => {
          const ids = new Set(filterCardIdsByFocus(cards, perfMap, focus));
          return ids.size === 0 ? [] : cards.filter((c) => ids.has(c.id));
        })();

  if (pool.length === 0) {
    return ({
      levelId,
      cards: [],
      focus,
      emptyReason: focus === "weak" ? "no_weak_cards" : "no_mastered_cards",
    });
  }

  const now = new Date();
  const rng = Math.random;
  const weightedQueue = buildWeightedSessionQueue(pool, stateByCard, options.limit, now, rng);

  const ids = [...new Set(weightedQueue.map(card => card.id))];
  report?.({ completed: 0, total: weightedQueue.length + 1 });
  const [content, distractors] = await Promise.all([
    prisma.studyCard.findMany({ where: { id: { in: ids }, kind: "ENGLISH_EXERCISE", deck: { levelId } },
      select: { id: true, frontJa: true, backEn: true, deckId: true, exerciseJson: true } }),
    prisma.studyCard.findMany({ where: { id: { in: pool.map(card => card.id) }, kind: "ENGLISH_EXERCISE", deck: { levelId } },
      take: 96, orderBy: { id: "asc" }, select: { id: true, frontJa: true, backEn: true } }),
  ]);
  const byId = new Map(content.map(card => [card.id, card]));
  function prepareCard(c: (typeof content)[number]): StudyQueueCard {
    const ex = parseStudyCardExercise(c.exerciseJson);
    if (ex) {
      const publicExercise = queuePayloadFromExercise(ex);
      return { id: c.id, frontJa: c.frontJa, ...publicExercise,
        ...(publicExercise.kind === "reorder" ? { tokens: shuffleTokensForQueue(publicExercise.tokens, c.id) } : {}) };
    }
    const st = stateByCard.get(c.id);
    const band = classifyPracticeBand(toPerformanceSlice(st));
    const distractorCount = mcqDistractorCountForBand(band);
    const fragmentMode = extractFillBlankAnswer(c.frontJa, c.backEn) != null;
    const correctPhrase = mcqCanonicalAnswer(c.frontJa, c.backEn);
    const distractorPool = distractors
      .filter((o) => o.id !== c.id)
      .map((o) =>
        fragmentMode ? mcqPoolPhraseWhenFragmentMode(o.frontJa, o.backEn) : o.backEn.trim(),
      );
    return {
      id: c.id,
      kind: "mcq" as const,
      frontJa: c.frontJa,
      options: buildFourOptions(correctPhrase, distractorPool, {
        rng,
        distractorCount,
        shortFallbackPool: fragmentMode ? MCQ_SHORT_FALLBACK_PHRASES : undefined,
      }),
    };
  }
  const out = weightedQueue.map((selected, index) => {
    const card = byId.get(selected.id);
    if (!card) throw new Error("Study card changed during preparation");
    const prepared = prepareCard(card);
    report?.({ completed: index + 1, total: weightedQueue.length + 1 });
    return prepared;
  });
  return { levelId, cards: out, focus };
}
