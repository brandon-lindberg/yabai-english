import { appPathForLocale } from "@/lib/i18n-app-path";

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

/** Browser-style path for the teacher profile, including locale prefix when needed. */
export function buildLocalizedTeacherProfilePath(
  locale: string,
  teacherId: string,
  onboardingNext: string | null | undefined,
  onboardingStep: string | null | undefined,
): string {
  const rel = buildTeacherCardProfileHref(teacherId, onboardingNext, onboardingStep);
  const qIndex = rel.indexOf("?");
  const pathOnly = qIndex === -1 ? rel : rel.slice(0, qIndex);
  const query = qIndex === -1 ? "" : rel.slice(qIndex + 1);
  const sp = query ? new URLSearchParams(query) : undefined;
  return appPathForLocale(locale, pathOnly, sp);
}
