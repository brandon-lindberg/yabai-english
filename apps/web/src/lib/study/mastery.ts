import type { PrismaClient } from "@prisma/client";

export async function computeLevelMastery(
  prisma: PrismaClient,
  userId: string,
  levelId: string,
): Promise<{ masteryScore: number; cardsTotal: number; cardsTouched: number }> {
  const cardsTotal = await prisma.studyCard.count({
    where: { deck: { levelId } },
  });
  if (cardsTotal === 0) {
    return { masteryScore: 0, cardsTotal: 0, cardsTouched: 0 };
  }

  const cardIds = (
    await prisma.studyCard.findMany({
      where: { deck: { levelId } },
      select: { id: true },
    })
  ).map((c) => c.id);

  const touched = await prisma.userStudyCardState.count({
    where: {
      userId,
      cardId: { in: cardIds },
      correctCount: { gte: 1 },
    },
  });

  const masteryScore = Math.min(100, Math.round((touched / cardsTotal) * 100));
  return { masteryScore, cardsTotal, cardsTouched: touched };
}
