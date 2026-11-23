import { z } from "zod";

export const studyStreakModes = ["DAILY", "WEEKLY", "MONTHLY"] as const;
export const studyStreakPreferenceSchema = z.object({
  mode: z.enum(studyStreakModes),
  weeklyGoal: z.number().int().min(1).max(7),
}).strict();

export type StudyStreakPreference = z.infer<typeof studyStreakPreferenceSchema>;
export const defaultStudyStreakPreference = { mode: "DAILY", weeklyGoal: 1 } as const satisfies StudyStreakPreference;
