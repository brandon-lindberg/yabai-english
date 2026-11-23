import { z } from "zod";

export const studyStreakModes = ["DAILY", "WEEKLY", "MONTHLY"] as const;
export const studyStreakPreferenceSchema = z.object({
  enabled: z.boolean().optional(),
  mode: z.enum(studyStreakModes),
  weeklyGoal: z.number().int().min(1).max(7),
}).strict();

export type StudyStreakUpdate = z.infer<typeof studyStreakPreferenceSchema>;
export type StudyStreakPreference = Required<StudyStreakUpdate>;
export const defaultStudyStreakPreference = { enabled: true, mode: "DAILY", weeklyGoal: 1 } as const satisfies StudyStreakPreference;
