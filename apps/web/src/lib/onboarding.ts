import { z } from "zod";

export const LEARNING_GOALS = [
  "conversation",
  "business",
  "exam",
  "kids",
] as const;

export const onboardingPayloadSchema = z
  .object({
    timezone: z.string().trim().min(1).max(100),
    learningGoals: z.array(z.enum(LEARNING_GOALS)).min(1),
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
