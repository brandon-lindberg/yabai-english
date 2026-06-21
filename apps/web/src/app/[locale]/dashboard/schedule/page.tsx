import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";
import { DashboardScheduleCalendar } from "@/components/dashboard-schedule-calendar";
import { DashboardUpcomingLessons } from "@/components/dashboard/dashboard-upcoming-lessons";
import { getTeacherBookingsForDashboard } from "@/lib/dashboard/teacher-bookings";
import { TeacherUpcomingLessons } from "@/components/dashboard/teacher-upcoming-lessons";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";
import { shouldLoadTeacherBookingsOnSchedule } from "@/lib/dashboard/schedule-view-role";

export default async function DashboardSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ onboardingNext?: string; onboardingStep?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const t = await getTranslations("dashboard.schedulePage");
  const td = await getTranslations("dashboard");
  const { onboardingNext, onboardingStep } = await searchParams;
  const onboardingHref = normalizeOnboardingNextHref(onboardingNext ?? null);

  if (shouldLoadTeacherBookingsOnSchedule(session.user.role)) {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        availabilitySlots: {
          where: { active: true },
          take: 1,
          select: { timezone: true },
        },
      },
    });
    const teacherTimeZone = profile?.availabilitySlots[0]?.timezone ?? "Asia/Tokyo";

    const teacherBookings = profile
      ? await getTeacherBookingsForDashboard(prisma, profile.id)
      : { bookings: [], upcoming: [], completed: [], scheduleItems: [] };

    return (
      <div className="space-y-8">
        <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />
        <p className="text-muted">{t("upcomingIntro")}</p>

        {teacherBookings.scheduleItems.length > 0 ? (
          <DashboardScheduleCalendar
            items={teacherBookings.scheduleItems}
            timeZone={teacherTimeZone}
          />
        ) : null}
        <ul className="space-y-4">
          <TeacherUpcomingLessons upcoming={teacherBookings.upcoming} />
        </ul>
      </div>
    );
  }

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { timezone: true },
  });
  const studentTimeZone = studentProfile?.timezone ?? "Asia/Tokyo";
  const { upcoming, scheduleItems } = await getStudentBookingsForDashboard(prisma, session.user.id);

  return (
    <div className="space-y-8">
      <p className="text-muted">{t("intro")}</p>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">{td("upcoming")}</h2>
        <DashboardScheduleCalendar items={scheduleItems} timeZone={studentTimeZone} />
        <ul className="mt-4 space-y-4">
          <DashboardUpcomingLessons upcoming={upcoming} />
        </ul>
      </section>
    </div>
  );
}
