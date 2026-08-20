import type { ReactNode } from "react";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";
import { PageHeader } from "@/components/ui/page-header";
import { StatLedger, type Stat } from "@/components/ui/stat-ledger";
import { DashboardNextLesson, type NextLessonView } from "@/components/dashboard/dashboard-next-lesson";

/**
 * The dashboard, in the order both flows read it.
 *
 * `dashboard/page.tsx` held two complete JSX trees — one per role — that shared
 * no layout. Each decided its own order, spacing and emphasis independently,
 * which is structurally why anything added to one flow silently missed the
 * other: the grouped lesson history, the profile view mode, the focal next
 * lesson all landed on one side only.
 *
 * The spine is the same question in both flows, asked in the same order:
 *
 *   1. anything unfinished from onboarding
 *   2. where am I
 *   3. what am I doing next          — the focal moment
 *   4. how am I doing                — the standing figures
 *   5. who am I here                 — the profile summary
 *   6. whatever else this flow needs
 *
 * Steps 3–5 used to be a teacher-only ledger and a student-only focal lesson,
 * positioned differently on each side. Now both flows get all three, and a new
 * section can only be added to one of them deliberately.
 */
export async function DashboardSpine({
  onboardingHref,
  onboardingStep,
  title,
  description,
  next,
  nextEmptyMessage,
  nextEmptyAction,
  stats,
  profileSummary,
  children,
}: {
  onboardingHref: string | null;
  onboardingStep: string | null;
  title: string;
  description: string;
  next: NextLessonView | null;
  nextEmptyMessage: string;
  nextEmptyAction: ReactNode;
  stats: Stat[];
  profileSummary: ReactNode;
  /** Flow-specific sections, beneath the shared spine. */
  children?: ReactNode;
}) {
  return (
    <div className="space-y-10">
      <OnboardingResumeBanner href={onboardingHref} step={onboardingStep} />
      <PageHeader title={title} description={description} />

      <DashboardNextLesson
        next={next}
        emptyMessage={nextEmptyMessage}
        emptyAction={nextEmptyAction}
      />

      <StatLedger stats={stats} />

      {profileSummary}

      {children}
    </div>
  );
}
