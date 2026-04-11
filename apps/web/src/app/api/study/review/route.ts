import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isStudyLevelUnlocked } from "@/lib/study/access";
import { getTotalStudyXpForTrack } from "@/lib/study/get-overview";
import { computeLevelMastery } from "@/lib/study/mastery";
import { studyRpgProgressFromTotalXp } from "@/lib/study/rpg-xp";
import { answersMatch, nextDueAtAfterQuiz, xpForMcq } from "@/lib/study/quiz";
import { z } from "zod";

const bodySchema = z.object({
  cardId: z.string().min(1),
  chosenAnswer: z.string(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const card = await prisma.studyCard.findUnique({
    where: { id: parsed.data.cardId },
    include: { deck: { include: { level: { include: { track: true } } } } },
  });
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const { level } = card.deck;
  const unlocked = await isStudyLevelUnlocked(prisma, session.user.id, level.trackId, level.levelCode);
  if (!unlocked) {
    return NextResponse.json({ error: "Level locked" }, { status: 403 });
  }

  const correct = answersMatch(parsed.data.chosenAnswer, card.backEn);
  const xpGain = xpForMcq(correct);
  const now = new Date();

  const existing = await prisma.userStudyCardState.findUnique({
    where: { userId_cardId: { userId: session.user.id, cardId: card.id } },
  });

  const correctCount = (existing?.correctCount ?? 0) + (correct ? 1 : 0);
  const wrongCount = (existing?.wrongCount ?? 0) + (correct ? 0 : 1);
  const streakCorrect = correct ? (existing?.streakCorrect ?? 0) + 1 : 0;
  const dueAt = nextDueAtAfterQuiz(correct, streakCorrect, now);

  const result = await prisma.$transaction(async (tx) => {
    await tx.userStudyCardState.upsert({
      where: { userId_cardId: { userId: session.user.id, cardId: card.id } },
      create: {
        userId: session.user.id,
        cardId: card.id,
        correctCount: correct ? 1 : 0,
        wrongCount: correct ? 0 : 1,
        streakCorrect,
        dueAt,
        reps: correctCount,
      },
      update: {
        correctCount,
        wrongCount,
        streakCorrect,
        dueAt,
        reps: correctCount,
      },
    });

    await tx.userStudyLevelProgress.upsert({
      where: { userId_levelId: { userId: session.user.id, levelId: level.id } },
      create: {
        userId: session.user.id,
        levelId: level.id,
        xp: xpGain,
        lastStudiedAt: now,
      },
      update: {
        xp: { increment: xpGain },
        lastStudiedAt: now,
      },
    });

    return tx.userStudyLevelProgress.findUniqueOrThrow({
      where: { userId_levelId: { userId: session.user.id, levelId: level.id } },
    });
  });

  const { masteryScore } = await computeLevelMastery(prisma, session.user.id, level.id);
  await prisma.userStudyLevelProgress.update({
    where: { userId_levelId: { userId: session.user.id, levelId: level.id } },
    data: { masteryScore },
  });

  const totalStudyXp = await getTotalStudyXpForTrack(prisma, session.user.id, level.trackId);
  const rpg = studyRpgProgressFromTotalXp(totalStudyXp);

  return NextResponse.json({
    correct,
    correctAnswer: card.backEn,
    xpGained: xpGain,
    levelXp: result.xp,
    masteryScore,
    correctCount,
    wrongCount,
    streakCorrect,
    rpg,
  });
}
