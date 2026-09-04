import { z } from "zod";
import {
  LEARNING_GOALS as GOAL_OPTIONS,
  LEARNING_GOALS_NOTE_MAX_CHARS,
} from "@/lib/student-learning-goals";

/*
  Derived from the shared list rather than restated. This was a third copy of
  the same four ids — the wizard had one, the profile another, and the
  validator this — so they could quietly come to disagree about what a goal is.
*/
export const LEARNING_GOALS = GOAL_OPTIONS.map((goal) => goal.id) as unknown as readonly [
  string,
  ...string[],
];

export const onboardingPayloadSchema = z
  .object({
    timezone: z.string().trim().min(1).max(100),
    learningGoals: z.array(z.enum(LEARNING_GOALS)).min(1),
    /*
      The schema is `.strict()`, so this has to be named or the wizard's whole
      save fails on an unknown key the moment the field is offered.
    */
    learningGoalsNote: z.string().max(LEARNING_GOALS_NOTE_MAX_CHARS).nullish(),
    notifyLessonReminders: z.boolean(),
    notifyMessages: z.boolean(),
    notifyPayments: z.boolean(),
    acceptedTerms: z.literal(true),
    acceptedPrivacy: z.literal(true),
    acceptedRecordingConsent: z.literal(true),
  })
  .strict();

type StudentOnboardingFields = {
  timezone: string;
  learningGoals: string[];
  termsAcceptedAt: Date | null;
  privacyAcceptedAt: Date | null;
  recordingConsentAt: Date | null;
  onboardingCompletedAt: Date | null;
};

export function isStudentOnboardingComplete(profile: StudentOnboardingFields) {
  return Boolean(
    profile.timezone &&
      profile.learningGoals.length > 0 &&
      profile.termsAcceptedAt &&
      profile.privacyAcceptedAt &&
      profile.recordingConsentAt &&
      profile.onboardingCompletedAt,
  );
}
