export const TEACHER_ONBOARDING_STEPS = [
  "profile",
  "integrations",
  "availability",
  "students",
  "chat",
  "notes",
  "materials",
] as const;

export type TeacherOnboardingStep = (typeof TEACHER_ONBOARDING_STEPS)[number];

export function isTeacherOnboardingOptionalStep(step: TeacherOnboardingStep): boolean {
  return step === "integrations" || step === "availability";
}
