import { auth } from "@/auth";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";

/**
 * The dashboard route: which flow, and nothing else.
 *
 * This file used to hold two complete JSX trees — 332 lines with a role branch
 * in the middle — that shared no layout at all. Both now build on
 * `DashboardSpine`, so the shape is one decision rather than two, and the route
 * only decides whose dashboard to render.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ onboardingNext?: string; onboardingStep?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { onboardingNext, onboardingStep } = await searchParams;
  const onboardingHref = normalizeOnboardingNextHref(onboardingNext ?? null);

  if (session.user.role !== "STUDENT") {
    return (
      <TeacherDashboard
        userId={session.user.id}
        role={session.user.role}
        onboardingHref={onboardingHref}
        onboardingStep={onboardingStep ?? null}
      />
    );
  }

  return (
    <StudentDashboard
      userId={session.user.id}
      onboardingHref={onboardingHref}
      onboardingStep={onboardingStep ?? null}
    />
  );
}
