import { z } from "zod";

export const studyStreakModes = ["DAILY", "WEEKLY", "MONTHLY"] as const;
export const studyStreakGoalLimits = { WEEKLY: 7, MONTHLY: 31 } as const;
export const studyStreakPreferenceSchema = z.object({
  enabled: z.boolean().optional(),
  mode: z.enum(studyStreakModes),
  weeklyGoal: z.number().int().min(1).max(studyStreakGoalLimits.WEEKLY),
  monthlyGoal: z.number().int().min(1).max(studyStreakGoalLimits.MONTHLY).optional(),
}).strict();

export type StudyStreakUpdate = z.infer<typeof studyStreakPreferenceSchema>;
export type StudyStreakPreference = Required<StudyStreakUpdate>;
export const defaultStudyStreakPreference = { enabled: true, mode: "DAILY", weeklyGoal: 1, monthlyGoal: 1 } as const satisfies StudyStreakPreference;
