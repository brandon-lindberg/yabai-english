import type { PrismaClient } from "@/generated/prisma/client";
import { getFlashcardStatisticsByLevelId } from "./study-flashcard-stats";

export function studyMasteryPercent(total: number, completed: number) {
  return total ? Math.min(100, Math.round(completed / total * 100)) : 0;
}

export async function computeLevelMastery(
  prisma: PrismaClient,
  userId: string,
  levelId: string,
): Promise<{ masteryScore: number; cardsTotal: number; cardsTouched: number }> {
  const { cardsTotal, cardsTouched } = (await getFlashcardStatisticsByLevelId(prisma, userId, [levelId])).get(levelId)!;
  return { masteryScore: studyMasteryPercent(cardsTotal, cardsTouched), cardsTotal, cardsTouched };
}
