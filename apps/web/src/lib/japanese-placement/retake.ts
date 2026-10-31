import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { isPlacementRetakeAllowed, placementRetakeEligibleAt } from "../placement-cooldown";
import { japaneseResultSchema } from "./public";

/** Only a Japanese award establishes its cooldown; later inconclusive attempts cannot reset it. */
export async function readJapanesePlacementRetake(db: Pick<PrismaClient, "japanesePlacementAttempt">, learnerId: string, now = Date.now()) {
  const award = await db.japanesePlacementAttempt.findFirst({
    where: { learnerId, status: "COMPLETED", result: { path: ["levelEstimate", "status"], equals: "estimated" } },
    orderBy: [{ finishedAt: "desc" }, { id: "desc" }], select: { id: true, finishedAt: true, result: true },
  });
  const parsed = japaneseResultSchema.safeParse(award?.result);
  const completedAt = award?.finishedAt && parsed.success && parsed.data.attemptId === award.id && parsed.data.levelEstimate.status === "estimated"
    ? award.finishedAt : null;
  return {
    completedAt,
    canStartNewAttempt: isPlacementRetakeAllowed(completedAt, now),
    retakeEligibleAt: completedAt ? placementRetakeEligibleAt(completedAt).toISOString() : null,
  };
}
