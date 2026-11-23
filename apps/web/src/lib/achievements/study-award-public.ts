import { z } from "zod";

export const studyAwardsSchema = z.array(z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  language: z.enum(["ENGLISH", "JAPANESE"]),
  awardedAt: z.string().datetime(),
  title: z.tuple([z.string(), z.string()]),
}).strict()).max(3);

export type StudyAward = z.infer<typeof studyAwardsSchema>[number];

export const achievementNoticeSchema = studyAwardsSchema.element.omit({ language: true }).extend({
  scope: z.enum(["LEARN_ENGLISH", "LEARN_JAPANESE", "TEACHING"]),
  hidden: z.boolean(),
});
export type AchievementNotice = z.infer<typeof achievementNoticeSchema>;


export function noticeFromStudyAward({ id, awardedAt, title, language }: StudyAward): AchievementNotice {
  return { id, awardedAt, title, scope: language === "JAPANESE" ? "LEARN_JAPANESE" : "LEARN_ENGLISH", hidden: false };
}
