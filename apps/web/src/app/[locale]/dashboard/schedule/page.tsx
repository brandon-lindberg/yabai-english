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
import { TeacherGroupClasses } from "@/components/dashboard/teacher-group-classes";
import { buildGroupClassRows, type GroupClassRow } from "@/lib/dashboard/group-classes";

/**
 * One schedule, two roles.
 *
 * A teacher's schedule and a student's schedule are the same page: a calendar
 * of what is booked, then the list of those lessons. Only the data source and
 * the row's actions differ. The two branches had each grown their own heading,
 * spacing and calendar placement, which is why the same feature read as two
 * different screens depending on who signed in.
 *
 * Everything here is still ahead. Refunded lessons have their own tab — they
 * are neither upcoming nor completed, and listing them under a heading that
 * says "upcoming" made a cancelled lesson read as a commitment.
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

  let timeZone: string;
  /** Whose reservations these are, which is what the detail dialog acts on. */
  let viewer: "teacher" | "student";
  let scheduleItems: Awaited<ReturnType<typeof getStudentBookingsForDashboard>>["scheduleItems"];
  let lessons: ReactNode;
  /** Teacher-only: a class is one time with several students, so it does not
   *  fit the one-row-per-lesson list above. */
  let groupClasses: GroupClassRow[] = [];

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

    const sessions = profile
      ? await prisma.groupLessonSession.findMany({
          where: { teacherId: profile.id, startsAt: { gte: new Date() } },
          orderBy: { startsAt: "asc" },
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            capacity: true,
            cancelledAt: true,
            bookings: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                status: true,
                holdExpiresAt: true,
                student: { select: { id: true, name: true, email: true } },
              },
            },
          },
        })
      : [];
    groupClasses = buildGroupClassRows(sessions);

    viewer = "teacher";
    timeZone = profile?.availabilitySlots[0]?.timezone ?? "Asia/Tokyo";
    scheduleItems = teacherBookings.scheduleItems;
    lessons = <TeacherUpcomingLessons upcoming={teacherBookings.upcoming} />;
  } else {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { timezone: true },
    });
    const student = await getStudentBookingsForDashboard(prisma, session.user.id);

    viewer = "student";
    timeZone = studentProfile?.timezone ?? "Asia/Tokyo";
    scheduleItems = student.scheduleItems;
    lessons = <DashboardUpcomingLessons upcoming={student.upcoming} />;
  }

  return (
    <div className="space-y-10">
      <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />

      {scheduleItems.length > 0 ? (
        <DashboardScheduleCalendar
          items={scheduleItems}
          timeZone={timeZone}
          viewer={viewer}
        />
      ) : null}

      <Section title={td("upcoming")} ruled={scheduleItems.length > 0}>
        <ul className="list-none border-t border-border p-0">{lessons}</ul>
      </Section>

      {groupClasses.length > 0 ? (
        <Section title={t("groupClassesTitle")} ruled>
          <TeacherGroupClasses classes={groupClasses} timeZone={timeZone} />
        </Section>
      ) : null}
    </div>
  );
}
