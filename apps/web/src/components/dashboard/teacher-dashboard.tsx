import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getTeacherBookingsForDashboard } from "@/lib/dashboard/teacher-bookings";
import { isTeacherCalendarReady } from "@/lib/teacher-calendar-status";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";
import { TEACHER_HOME_SCHEDULE_HREFS, withDashboardOnboarding } from "@/lib/teacher-dashboard-home-links";
import { DashboardSpine } from "@/components/dashboard/dashboard-spine";
import { DashboardProfileSummary } from "@/components/dashboard/dashboard-profile-summary";
import { TeacherUpcomingLessons } from "@/components/dashboard/teacher-upcoming-lessons";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Section } from "@/components/ui/section";
import { buttonClasses } from "@/components/ui/button";

/**
 * A teacher's dashboard: the shared spine, then their own sections.
 *
 * Was a branch inside `dashboard/page.tsx` with its own complete layout. It
 * opened on a ledger of counts and buried the next lesson in a list — the
 * student side had had a focal next lesson since the redesign began.
 */
export async function TeacherDashboard({
  userId,
  role,
  onboardingHref,
  onboardingStep,
}: {
  userId: string;
  role: string;
  onboardingHref: string | null;
  onboardingStep: string | null;
}) {
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const th = await getTranslations("dashboard.highlights");

  const [teacherProfile, googleSettings, accountUser] = await Promise.all([
    prisma.teacherProfile.findUnique({
      where: { userId },
      /*
        `select`, not `include`. The refresh token is named because this page
        needs it — but only as a boolean, for the legacy calendar-readiness
        fallback. Naming it keeps it greppable and stops the query picking up
        whatever sensitive column the model gains next.
      */
      select: {
        id: true,
        displayName: true,
        bio: true,
        googleCalendarRefreshToken: true,
        user: { select: { name: true, email: true, image: true } },
        availabilitySlots: { where: { active: true }, select: { id: true } },
      },
    }),
    prisma.googleIntegrationSettings.findUnique({
      where: { userId },
      select: { calendarConnected: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, image: true },
    }),
  ]);

  const bookings = teacherProfile
    ? await getTeacherBookingsForDashboard(prisma, teacherProfile.id)
    : { bookings: [], upcoming: [], completed: [], scheduleItems: [] };

  const calendarReady = isTeacherCalendarReady({
    calendarConnected: googleSettings?.calendarConnected,
    legacyRefreshTokenPresent: Boolean(teacherProfile?.googleCalendarRefreshToken),
  });

  const nextBooking = bookings.upcoming[0];

  return (
    <DashboardSpine
      onboardingHref={onboardingHref}
      onboardingStep={onboardingStep}
      title={t("teacherHome.title")}
      description={t("teacherHome.body")}
      next={
        nextBooking
          ? {
              id: nextBooking.id,
              startsAt: nextBooking.startsAt,
              endsAt: nextBooking.endsAt,
              counterpartName:
                nextBooking.student.name ?? nextBooking.student.email ?? "—",
              lessonNameJa: nextBooking.lessonProduct.nameJa,
              lessonNameEn: nextBooking.lessonProduct.nameEn,
              status: nextBooking.status,
              meetUrl: nextBooking.meetUrl,
            }
          : null
      }
      // A teacher with no bookings does not need a "book a lesson" button —
      // they need students to be able to find a slot.
      nextEmptyMessage={th("noNextLessonTeacher")}
      nextEmptyAction={
        <Link
          href={withDashboardOnboarding(TEACHER_HOME_SCHEDULE_HREFS.availability, onboardingHref)}
          className={buttonClasses({ size: "lg" })}
        >
          {th("openAvailabilityCta")}
        </Link>
      }
      stats={[
        {
          label: t("teacherHome.statUpcoming"),
          value: bookings.upcoming.length,
          render: ({ className, children }) => (
            <Link
              href={withDashboardOnboarding(TEACHER_HOME_SCHEDULE_HREFS.upcoming, onboardingHref)}
              aria-label={`${t("teacherHome.statUpcoming")}: ${bookings.upcoming.length}`}
              className={className}
            >
              {children}
            </Link>
          ),
        },
        {
          label: t("teacherHome.statCompleted"),
          value: bookings.completed.length,
          render: ({ className, children }) => (
            <Link
              href={withDashboardOnboarding(TEACHER_HOME_SCHEDULE_HREFS.completed, onboardingHref)}
              aria-label={`${t("teacherHome.statCompleted")}: ${bookings.completed.length}`}
              className={className}
            >
              {children}
            </Link>
          ),
        },
        {
          label: t("teacherHome.statSlots"),
          value: teacherProfile?.availabilitySlots.length ?? 0,
          render: ({ className, children }) => (
            <Link
              href={withDashboardOnboarding(
                TEACHER_HOME_SCHEDULE_HREFS.availability,
                onboardingHref,
              )}
              aria-label={`${t("teacherHome.statSlots")}: ${teacherProfile?.availabilitySlots.length ?? 0}`}
              className={className}
            >
              {children}
            </Link>
          ),
        },
      ]}
      profileSummary={
        <DashboardProfileSummary
          name={teacherProfile?.displayName ?? teacherProfile?.user.name ?? accountUser?.name ?? null}
          email={teacherProfile?.user.email ?? accountUser?.email ?? null}
          image={teacherProfile?.user.image ?? accountUser?.image ?? null}
          shortBio={teacherProfile?.bio ?? null}
          rpg={null}
          emptyBioLabel={th("teacherProfileCardEmpty")}
        />
      }
    >
      {isTeacherCabinetRole(role) && !calendarReady ? (
        <InlineAlert variant="info">
          <span className="text-foreground">{t("teacherHome.calendarSetupHint")} </span>
          <Link href="/dashboard/settings" className="font-semibold text-link hover:opacity-90">
            {tCommon("settings")}
          </Link>
        </InlineAlert>
      ) : null}

      <Section title={t("teacherHome.upcomingSection")}>
        <ul className="list-none border-t border-border p-0">
          <TeacherUpcomingLessons upcoming={bookings.upcoming} />
        </ul>
      </Section>
    </DashboardSpine>
  );
}
