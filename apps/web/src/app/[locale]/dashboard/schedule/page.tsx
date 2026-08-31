import type { ReactNode } from "react";
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
import { Section } from "@/components/ui/section";
import { RefundedLessons } from "@/components/dashboard/refunded-lessons";

/**
 * One schedule, two roles.
 *
 * A teacher's schedule and a student's schedule are the same page: a calendar
 * of what is booked, then the list of those lessons. Only the data source, the
 * intro line and the row's actions differ. The two branches had each grown
 * their own heading, spacing and calendar placement, which is why the same
 * feature read as two different screens depending on who signed in.
 */

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

  let intro: string;
  let timeZone: string;
  let scheduleItems: Awaited<ReturnType<typeof getStudentBookingsForDashboard>>["scheduleItems"];
  let refundedLessons: React.ReactNode = null;
  let hasRefunded = false;
  let lessons: ReactNode;

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
    const teacherBookings = profile
      ? await getTeacherBookingsForDashboard(prisma, profile.id)
      : { bookings: [], upcoming: [], completed: [], refunded: [], scheduleItems: [] };

    intro = t("upcomingIntro");
    timeZone = profile?.availabilitySlots[0]?.timezone ?? "Asia/Tokyo";
    scheduleItems = teacherBookings.scheduleItems;
    lessons = <TeacherUpcomingLessons upcoming={teacherBookings.upcoming} />;
    refundedLessons = (
      <RefundedLessons
        refunded={teacherBookings.refunded}
        counterpartLabel={t("studentLabel")}
        counterpartName={(b) => b.student.name ?? b.student.email ?? "—"}
      />
    );
    hasRefunded = teacherBookings.refunded.length > 0;
  } else {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { timezone: true },
    });
    const student = await getStudentBookingsForDashboard(prisma, session.user.id);

    intro = t("intro");
    timeZone = studentProfile?.timezone ?? "Asia/Tokyo";
    scheduleItems = student.scheduleItems;
    lessons = <DashboardUpcomingLessons upcoming={student.upcoming} />;
    refundedLessons = (
      <RefundedLessons
        refunded={student.refunded}
        counterpartLabel={td("teacher")}
        counterpartName={(b) => b.teacher.user.name ?? b.teacher.user.email ?? "—"}
      />
    );
    hasRefunded = student.refunded.length > 0;
  }

  return (
    <div className="space-y-10">
      <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />
      <p className="max-w-[62ch] text-muted">{intro}</p>

      {scheduleItems.length > 0 ? (
        <DashboardScheduleCalendar items={scheduleItems} timeZone={timeZone} />
      ) : null}

      <Section title={td("upcoming")} ruled={scheduleItems.length > 0}>
        <ul className="list-none border-t border-border p-0">{lessons}</ul>
      </Section>

      {hasRefunded ? (
        <Section title={td("refundedLessons")} ruled>
          <ul className="list-none border-t border-border p-0">{refundedLessons}</ul>
        </Section>
      ) : null}
    </div>
  );
}
