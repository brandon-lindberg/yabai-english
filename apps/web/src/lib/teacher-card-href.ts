export function buildTeacherCardProfileHref(
  teacherId: string,
  onboardingNext: string | null | undefined,
  onboardingStep: string | null | undefined,
): string {
  const base = `/book/teachers/${teacherId}`;
  const qs = new URLSearchParams();
  if (onboardingNext) qs.set("onboardingNext", onboardingNext);
  if (onboardingStep) qs.set("onboardingStep", onboardingStep);
  const query = qs.toString();
  return query ? `${base}?${query}` : base;
}
