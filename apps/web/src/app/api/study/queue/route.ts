import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isStudyLevelUnlocked } from "@/lib/study/access";
import {
  classifyPracticeBand,
  filterCardIdsByFocus,
  mcqDistractorCountForBand,
  type StudyCardPerformanceSlice,
} from "@/lib/study/study-card-analytics";
import { buildFourOptions, cardQuizWeight, weightedSampleWithoutReplacement } from "@/lib/study/quiz";
import { StudyLevelCode } from "@prisma/client";
import { z } from "zod";

const querySchema = z.object({
  trackSlug: z.string().min(1).default("english-flashcards"),
  levelCode: z.nativeEnum(StudyLevelCode),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  focus: z.enum(["mixed", "weak", "mastered"]).default("mixed"),
});

type CardRow = { id: string; frontJa: string; backEn: string; deckId: string };

type StateRow = {
  dueAt: Date | null;
  correctCount: number;
  wrongCount: number;
  streakCorrect: number;
  averageAnswerMs: number | null;
  latencySampleCount: number;
};

function buildWeightedSessionQueue(
  cards: CardRow[],
  stateByCard: Map<string, StateRow>,
  limit: number,
  now: Date,
  rng: () => number,
): CardRow[] {
  if (cards.length === 0) return [];

  const weightFn = (c: CardRow) => {
    const st = stateByCard.get(c.id);
    return cardQuizWeight(
      st
        ? {
            correctCount: st.correctCount,
            wrongCount: st.wrongCount,
            streakCorrect: st.streakCorrect,
            averageAnswerMs: st.averageAnswerMs,
            latencySampleCount: st.latencySampleCount,
          }
        : null,
    );
  };

  const due = cards.filter((c) => {
    const st = stateByCard.get(c.id);
    return st?.dueAt != null && st.dueAt <= now;
  });

  const primaryPool = due.length > 0 ? due : cards;
  const firstBatch = weightedSampleWithoutReplacement(primaryPool, weightFn, Math.min(limit, primaryPool.length), rng);

  const queue: CardRow[] = [...firstBatch];

  while (queue.length < limit) {
    const extra = weightedSampleWithoutReplacement(cards, weightFn, 1, rng)[0];
    if (!extra) break;
    queue.push(extra);
    if (queue.length > limit * 3) break;
  }

  return queue.slice(0, limit);
}

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

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    trackSlug: url.searchParams.get("trackSlug") ?? undefined,
    levelCode: url.searchParams.get("levelCode") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    focus: url.searchParams.get("focus") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const track = await prisma.studyTrack.findUnique({
    where: { slug: parsed.data.trackSlug },
  });
  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  const level = await prisma.studyLevel.findUnique({
    where: { trackId_levelCode: { trackId: track.id, levelCode: parsed.data.levelCode } },
  });
  if (!level) {
    return NextResponse.json({ error: "Level not found" }, { status: 404 });
  }

  const unlocked = await isStudyLevelUnlocked(prisma, session.user.id, track.id, level.levelCode);
  if (!unlocked) {
    return NextResponse.json({ error: "Level locked" }, { status: 403 });
  }

  await prisma.userStudyLevelProgress.upsert({
    where: { userId_levelId: { userId: session.user.id, levelId: level.id } },
    create: { userId: session.user.id, levelId: level.id },
    update: {},
  });

  const cards: CardRow[] = await prisma.studyCard.findMany({
    where: { deck: { levelId: level.id } },
    orderBy: [{ deck: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    select: { id: true, frontJa: true, backEn: true, deckId: true },
  });

  if (cards.length === 0) {
    return NextResponse.json({
      levelId: level.id,
      levelCode: level.levelCode,
      cards: [],
      focus: parsed.data.focus,
    });
  }

  const states = await prisma.userStudyCardState.findMany({
    where: { userId: session.user.id, cardId: { in: cards.map((c) => c.id) } },
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

  const focus = parsed.data.focus;
  const pool: CardRow[] =
    focus === "mixed"
      ? cards
      : (() => {
          const ids = new Set(filterCardIdsByFocus(cards, perfMap, focus));
          return ids.size === 0 ? [] : cards.filter((c) => ids.has(c.id));
        })();

  if (pool.length === 0) {
    return NextResponse.json({
      levelId: level.id,
      levelCode: level.levelCode,
      cards: [],
      focus,
      emptyReason: focus === "weak" ? "no_weak_cards" : "no_mastered_cards",
    });
  }

  const now = new Date();
  const rng = Math.random;
  const poolBacks = pool.map((c) => c.backEn);
  const weightedQueue = buildWeightedSessionQueue(pool, stateByCard, parsed.data.limit, now, rng);

  const out = weightedQueue.map((c) => {
    const st = stateByCard.get(c.id);
    const band = classifyPracticeBand(toPerformanceSlice(st));
    const distractorCount = mcqDistractorCountForBand(band);
    return {
      id: c.id,
      frontJa: c.frontJa,
      options: buildFourOptions(c.backEn, poolBacks.filter((b) => b !== c.backEn), {
        rng,
        distractorCount,
      }),
    };
  });

  return NextResponse.json({
    levelId: level.id,
    levelCode: level.levelCode,
    cards: out,
    focus,
  });
}
