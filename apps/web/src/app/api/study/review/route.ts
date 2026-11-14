import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { englishLearningAccessError } from "@/lib/english-learning-access";
import { prisma } from "@/lib/prisma";
import { isStudyLevelUnlocked } from "@/lib/study/access";
import { getTotalStudyXpForTrack } from "@/lib/study/get-overview";
import { computeLevelMastery } from "@/lib/study/mastery";
import { notifyStudyRankUpIfNeeded } from "@/lib/study/rpg-rank-notification";
import { studyRpgProgressFromTotalXp } from "@/lib/study/rpg-xp";
import {
  classifyPracticeBand,
  studyAccuracyPercent,
  type StudyCardPerformanceSlice,
} from "@/lib/study/study-card-analytics";
import {
  correctAnswerForDisplay,
  gradeStudyCardReview,
  parseStudyCardExercise,
  type StudyReviewPayload,
} from "@/lib/study/card-exercise";
import { saveStudyReviewProgress } from "@/lib/study/review-progress";
import { z } from "zod";

const bodySchema = z.object({
  cardId: z.string().min(1),
  chosenAnswer: z.string().optional(),
  reorderTokenIds: z.array(z.string()).optional(),
  multiStepAnswers: z.array(z.string()).optional(),
  answerTimeMs: z.number().int().min(0).max(300_000).optional(),
});

function buildReviewPayload(
  exercise: ReturnType<typeof parseStudyCardExercise>,
  body: z.infer<typeof bodySchema>,
): StudyReviewPayload | null {
  if (!exercise) {
    if (body.chosenAnswer == null || body.chosenAnswer.trim() === "") return null;
    return { mode: "mcq", chosenAnswer: body.chosenAnswer };
  }
  if (exercise.kind === "reorder") {
    if (!body.reorderTokenIds?.length) return null;
    return { mode: "reorder", reorderTokenIds: body.reorderTokenIds };
  }
  if (!body.multiStepAnswers || body.multiStepAnswers.length !== exercise.steps.length) return null;
  return { mode: "multi_step", multiStepAnswers: body.multiStepAnswers };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const languageError = englishLearningAccessError(session.user.learningLanguage);
  if (languageError) return languageError;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const card = await prisma.studyCard.findUnique({
    where: { id: parsed.data.cardId },
    select: {
      id: true, kind: true, frontJa: true, backEn: true, exerciseJson: true,
      deck: { select: { level: { select: { id: true, trackId: true, levelCode: true } } } },
    },
  });
  if (!card || card.kind !== "ENGLISH_EXERCISE") {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const { level } = card.deck;
  const unlocked = await isStudyLevelUnlocked(prisma, session.user.id, level.trackId, level.levelCode);
  if (!unlocked) {
    return NextResponse.json({ error: "Level locked" }, { status: 403 });
  }

  const exercise = parseStudyCardExercise(card.exerciseJson);
  const payload = buildReviewPayload(exercise, parsed.data);
  if (!payload) {
    return NextResponse.json({ error: "Invalid review payload for this card" }, { status: 400 });
  }
  const correct = gradeStudyCardReview(
    { backEn: card.backEn, frontJa: card.frontJa },
    exercise,
    payload,
  );
  const now = new Date();

  const { state, xpGained: xpGain, progress: result, masteryScore, totalStudyXp } = await prisma.$transaction(async tx => {
    const saved = await saveStudyReviewProgress(tx, { userId: session.user.id, cardId: card.id, levelId: level.id,
      correct, now, answerTimeMs: parsed.data.answerTimeMs });
    // The shared saver holds the learner lock until commit. Read the resulting
    // XP once and persist mastery in that same transaction, so concurrent answers
    // cannot report each other's XP or leave a partially committed review.
    const totalStudyXp = await getTotalStudyXpForTrack(tx, session.user.id, level.trackId);
    const { masteryScore } = await computeLevelMastery(tx, session.user.id, level.id);
    await tx.userStudyLevelProgress.update({
      where: { userId_levelId: { userId: session.user.id, levelId: level.id } },
      data: { masteryScore },
    });
    return { ...saved, masteryScore, totalStudyXp };
  });
  const { correctCount, wrongCount, streakCorrect, averageAnswerMs, latencySampleCount } = state;
  const rpg = studyRpgProgressFromTotalXp(totalStudyXp);

  await notifyStudyRankUpIfNeeded({
    userId: session.user.id,
    previousTotalXp: totalStudyXp - xpGain,
    newTotalXp: totalStudyXp,
  });

  const perfSlice: StudyCardPerformanceSlice = {
    correctCount,
    wrongCount,
    streakCorrect,
    averageAnswerMs,
    latencySampleCount,
  };

  return NextResponse.json({
    correct,
    correctAnswer: correctAnswerForDisplay(card.frontJa, card.backEn, exercise),
    xpGained: xpGain,
    levelXp: result.xp,
    masteryScore,
    correctCount,
    wrongCount,
    streakCorrect,
    rpg,
    practiceBand: classifyPracticeBand(perfSlice),
    accuracyPercent: studyAccuracyPercent(correctCount, wrongCount),
    averageAnswerMs,
  });
}
