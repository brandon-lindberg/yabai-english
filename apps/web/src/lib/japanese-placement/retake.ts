import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { isPlacementRetakeAllowed, placementRetakeEligibleAt } from "../placement-cooldown";
import { japaneseResultSchema, type JapanesePlacementResult } from "./public";

/** The latest validated award survives later incomplete or inconclusive attempts. */
export async function readLatestJapanesePlacementAward(db: Pick<PrismaClient, "japanesePlacementAttempt">, learnerId: string) {
  const award = await db.japanesePlacementAttempt.findFirst({
    where: { learnerId, status: "COMPLETED", result: { path: ["levelEstimate", "status"], equals: "estimated" } },
    orderBy: [{ finishedAt: "desc" }, { id: "desc" }], select: { id: true, finishedAt: true, result: true },
  });
  const parsed = japaneseResultSchema.safeParse(award?.result);
  return award?.finishedAt && parsed.success && parsed.data.attemptId === award.id && parsed.data.levelEstimate.status === "estimated"
    ? { id: award.id, completedAt: award.finishedAt, result: award.result as unknown as JapanesePlacementResult } : null;
}

/** Only a Japanese award establishes its cooldown; later inconclusive attempts cannot reset it. */
export async function readJapanesePlacementRetake(db: Pick<PrismaClient, "japanesePlacementAttempt">, learnerId: string, now = Date.now()) {
  const award = await readLatestJapanesePlacementAward(db, learnerId);
  const completedAt = award?.completedAt ?? null;
  return {
    completedAt,
    canStartNewAttempt: isPlacementRetakeAllowed(completedAt, now),
    retakeEligibleAt: completedAt ? placementRetakeEligibleAt(completedAt).toISOString() : null,
    result: award?.result ?? null,
  };
}
