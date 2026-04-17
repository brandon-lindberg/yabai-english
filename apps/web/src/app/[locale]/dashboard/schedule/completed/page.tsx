import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";
import { DashboardCompletedLessons } from "@/components/dashboard/dashboard-completed-lessons";
import { getTeacherBookingsForDashboard } from "@/lib/dashboard/teacher-bookings";
import { TeacherCompletedLessons } from "@/components/dashboard/teacher-completed-lessons";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";

export default async function DashboardScheduleCompletedPage({
  searchParams,
}: {
  searchParams: Promise<{ onboardingNext?: string; onboardingStep?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const t = await getTranslations("dashboard.schedulePage");
  const { onboardingNext, onboardingStep } = await searchParams;
  const onboardingHref = normalizeOnboardingNextHref(onboardingNext ?? null);

  if (session.user.role === "TEACHER") {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const teacherBookings = profile
      ? await getTeacherBookingsForDashboard(prisma, profile.id)
      : { bookings: [], upcoming: [], completed: [], scheduleItems: [] };

    return (
      <div className="space-y-8">
        <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />
        <p className="text-muted">Review your completed lessons and teaching history.</p>
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">{t("completedSectionTitle")}</h2>
          <div className="mt-4">
            <TeacherCompletedLessons completed={teacherBookings.completed} />
          </div>
        </section>
      </div>
    );
  }

  const { completed } = await getStudentBookingsForDashboard(prisma, session.user.id);

  return (
    <div className="space-y-8">
      <p className="text-muted">{t("completedIntro")}</p>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">{t("completedSectionTitle")}</h2>
        <ul className="space-y-4">
          <DashboardCompletedLessons completed={completed} />
        </ul>
      </section>
    </div>
  );
}
