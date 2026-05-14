/** Schedule sub-routes linked from the teacher home dashboard. */
export const TEACHER_HOME_SCHEDULE_HREFS = {
  upcoming: "/dashboard/schedule",
  completed: "/dashboard/schedule/completed",
  availability: "/dashboard/schedule/availability",
} as const;

export function withDashboardOnboarding(href: string, onboardingNext: string | null | undefined): string {
  const next = onboardingNext?.trim();
  if (!next) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}onboardingNext=${encodeURIComponent(next)}`;
}
