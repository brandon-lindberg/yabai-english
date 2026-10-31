import { TEACHER_ONBOARDING_STEPS, type TeacherOnboardingStep } from "./teacher-onboarding-steps";
export type { TeacherOnboardingStep } from "./teacher-onboarding-steps";

const STEP_SET = new Set<string>(TEACHER_ONBOARDING_STEPS);

/** A dashboard checklist step is a visit, never a claim that onboarding is finished. */
export function isTeacherOnboardingVisit(href: string | null, step: string | null | undefined): boolean {
  return Boolean(step && STEP_SET.has(step) && href && /^\/onboarding\/teacher(?:\?|$)/.test(href));
}

export function parseCompletedTeacherOnboardingSteps(
  raw: string | null | undefined,
): TeacherOnboardingStep[] {
  if (!raw) return [];
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s): s is TeacherOnboardingStep => STEP_SET.has(s));
  return [...new Set(items)];
}

export function buildTeacherOnboardingContinueHref(
  baseDashboardHref: string,
  completed: TeacherOnboardingStep[],
  doneStep: TeacherOnboardingStep,
): string {
  const nextCompleted = [...new Set([...completed, doneStep])];
  const params = new URLSearchParams({
    completed: nextCompleted.join(","),
  });
  return `${baseDashboardHref}?onboardingNext=${encodeURIComponent(`/onboarding/teacher?${params.toString()}`)}`;
}

export function buildTeacherOnboardingReturnFromProfile(
  onboardingCompletedAt: Date | null | undefined,
  completedRaw: string | null | undefined,
): string | null {
  if (onboardingCompletedAt) return null;
  const completed = parseCompletedTeacherOnboardingSteps(completedRaw);
  const params = new URLSearchParams({
    completed: [...new Set([...completed, "profile"])].join(","),
  });
  return `/onboarding/teacher?${params.toString()}`;
}

export function normalizeOnboardingNextHref(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
