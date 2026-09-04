import { buildOccurrenceSkipIndex } from "@/lib/availability-occurrence-skips";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getTeacherBookingsForDashboard } from "@/lib/dashboard/teacher-bookings";
import { countOpenAvailabilitySlots } from "@/lib/dashboard/teacher-open-availability";
import { isTeacherCalendarReady } from "@/lib/teacher-calendar-status";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";
import { TEACHER_HOME_SCHEDULE_HREFS, withDashboardOnboarding } from "@/lib/teacher-dashboard-home-links";
import { DashboardSpine } from "@/components/dashboard/dashboard-spine";
import { DashboardProfileSummary } from "@/components/dashboard/dashboard-profile-summary";
import { TeacherProfileForm } from "@/components/dashboard/teacher-profile-form";
import { TeacherUpcomingLessons } from "@/components/dashboard/teacher-upcoming-lessons";
import { InlineAlert } from "@/components/ui/inline-alert";
import { inlineLinkClass } from "@/components/ui/inline-link";
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
        // The rest are for the edit dialog in the profile card, which edits
        // more of the profile than the card displays.
        countryOfOrigin: true,
        credentials: true,
        instructionLanguages: true,
        specialties: true,
        marketplaceHidden: true,
        googleCalendarRefreshToken: true,
        user: { select: { name: true, email: true, image: true } },
        /*
          The open-slot stat needs the recurrence shape, not just row ids: an
          active row is not the same as open availability once its date has
          passed or its occurrence is booked.
        */
        availabilitySlots: {
          where: { active: true },
          select: {
            id: true,
            dayOfWeek: true,
            startMin: true,
            endMin: true,
            timezone: true,
            recurrence: true,
            startsOn: true,
            endsOn: true,
          },
        },
        availabilityOccurrenceSkips: { select: { slotId: true, startsAtIso: true } },
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

  /*
    Counting active slot rows overstated this: a one-off slot whose date has
    passed, a weekly slot past its `endsOn`, and a slot whose occurrence is
    already booked all stay active. The stat says "open", so it counts the
    slots that still have a free occurrence ahead — the same past/skipped/booked
    rules the availability calendar draws with.
  */
  const openAvailabilitySlots = countOpenAvailabilitySlots({
    slots: teacherProfile?.availabilitySlots ?? [],
    bookings: bookings.bookings
      .filter((b) => b.status !== "CANCELLED")
      .map((b) => ({
        startsAtIso: b.startsAt.toISOString(),
        endsAtIso: b.endsAt.toISOString(),
      })),
    skippedOccurrences: buildOccurrenceSkipIndex(
      teacherProfile?.availabilityOccurrenceSkips ?? [],
    ),
  });

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
          value: openAvailabilitySlots,
          render: ({ className, children }) => (
            <Link
              href={withDashboardOnboarding(
                TEACHER_HOME_SCHEDULE_HREFS.availability,
                onboardingHref,
              )}
              aria-label={`${t("teacherHome.statSlots")}: ${openAvailabilitySlots}`}
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
          editSlot={
            <TeacherProfileForm
              presentation="trigger"
              showGooglePrefillHint={false}
              avatarUrl={teacherProfile?.user.image ?? accountUser?.image ?? null}
              initialTeacherProfileId={teacherProfile?.id ?? null}
              initialDisplayName={teacherProfile?.displayName ?? null}
              initialBio={teacherProfile?.bio ?? null}
              initialCountryOfOrigin={teacherProfile?.countryOfOrigin ?? null}
              initialCredentials={teacherProfile?.credentials ?? null}
              initialInstructionLanguages={teacherProfile?.instructionLanguages ?? ["EN"]}
              initialSpecialties={teacherProfile?.specialties ?? []}
              initialMarketplaceHidden={teacherProfile?.marketplaceHidden ?? false}
            />
          }
        />
      }
    >
      {isTeacherCabinetRole(role) && !calendarReady ? (
        <InlineAlert variant="info">
          <span className="text-foreground">{t("teacherHome.calendarSetupHint")} </span>
          <Link href="/dashboard/settings" className={inlineLinkClass}>
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
