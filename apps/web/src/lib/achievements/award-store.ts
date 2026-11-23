import "server-only";
import type { AchievementScope, Prisma } from "@/generated/prisma/client";
import { learnerBadges } from "./gallery";
import { teachingMilestones } from "./teaching-catalogue";
import type { AchievementNotice } from "./study-award-public";

const studentBadges = new Map(learnerBadges.map(badge => [badge.id, badge]));
const teacherBadges = new Map<string, { title: readonly string[]; hidden?: true | false }>(
  teachingMilestones.map(badge => [badge.id, { title: badge.title, hidden: "hidden" in badge }]),
);

export function awardNotice(scope: AchievementScope, row: { achievementId: string; awardedAt: Date }): AchievementNotice[] {
  const badge = (scope === "TEACHING" ? teacherBadges : studentBadges).get(row.achievementId);
  return badge ? [{ id: row.achievementId, scope, title: [badge.title[0], badge.title[1]], hidden: Boolean(badge.hidden),
    awardedAt: row.awardedAt.toISOString() }] : [];
}

export async function saveAchievements(db: Prisma.TransactionClient, userId: string, scope: AchievementScope, ids: string[]) {
  if (!ids.length) return [];
  const options = { select: { achievementId: true, awardedAt: true }, skipDuplicates: true } as const;
  const rows = scope === "TEACHING"
    ? await db.teachingAchievementAward.createManyAndReturn({ ...options, data: ids.map(achievementId => ({ userId, achievementId })) })
    : await db.learningAchievementAward.createManyAndReturn({
      ...options,
      data: ids.map(achievementId => ({ userId, achievementId, learningLanguage: scope === "LEARN_JAPANESE" ? "JAPANESE" as const : "ENGLISH" as const })),
    });
  const byId = new Map(rows.map(row => [row.achievementId, row]));
  return ids.flatMap(id => {
    const row = byId.get(id);
    return row ? awardNotice(scope, row) : [];
  });
}
