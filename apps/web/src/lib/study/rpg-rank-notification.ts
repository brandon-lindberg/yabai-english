import { createUserNotification } from "@/lib/notifications";
import { studyRpgProgressFromTotalXp } from "./rpg-xp";

/**
 * Sends a one-shot congratulations notification when total study XP crosses an RPG rank boundary.
 */
export async function notifyStudyRankUpIfNeeded(input: {
  userId: string;
  previousTotalXp: number;
  newTotalXp: number;
}): Promise<void> {
  const before = studyRpgProgressFromTotalXp(input.previousTotalXp);
  const after = studyRpgProgressFromTotalXp(input.newTotalXp);
  if (after.rank <= before.rank) return;

  await createUserNotification({
    userId: input.userId,
    titleEn: `Congratulations! You reached rank ${after.rank}`,
    titleJa: `おめでとうございます！ランク ${after.rank} に到達しました`,
    bodyEn: `Your learning rank is now ${after.rank}. Keep up the great work!`,
    bodyJa: `学習ランクが ${after.rank} になりました。引き続き頑張りましょう！`,
  });
}
