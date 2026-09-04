import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { TeacherCard } from "@/components/teacher-card";
import { TeacherBrowseControls } from "@/components/teacher-browse-controls";
import { filterTeacherCards, sortOwnTeachersFirst } from "@/lib/teacher-discovery";
import { marketplaceTeacherWhere } from "@/lib/marketplace-teacher-filter";
import { getStudentRosterTeachers } from "@/lib/student-roster-teachers";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/i18n/navigation";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";
import { appPathForLocale } from "@/lib/i18n-app-path";
import { authSignInHref } from "@/lib/auth-sign-in-href";
import { buttonClasses } from "@/components/ui/button";
import { browseEmptyState } from "@/lib/teacher-browse-empty-state";
import { teacherHasBookableFreeTrial } from "@/lib/free-trial-offering";
import { visibleAvailabilityWhere } from "@/lib/assigned-availability";
import { expandRecurringOccurrencesInRange } from "@/lib/recurring-slot-occurrences";
import { availabilityBands, previewDays, previewWindow } from "@/lib/availability-bands";
import { TeacherBrowseList, type TeacherPreview } from "@/components/teacher-browse-list";
import { timeRangesOverlap } from "@/lib/teacher-availability-display";
import { slotHoldingBookingWhere } from "@/lib/pending-booking-hold";
import { dateOnlyInZone } from "@/lib/date-only-in-zone";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "booking" });
  return {
    title: t("title"),
    description: t("teacherBrowseSubtitle"),
  };
}

type Props = {
  searchParams: Promise<{
    specialty?: string;
    language?: string;
    onboardingNext?: string;
    onboardingStep?: string;
  }>;
};

export default async function BookPage({ searchParams }: Props) {
  const t = await getTranslations("booking");
  const tCommon = await getTranslations("common");
  const params = await searchParams;
  const session = await auth();
  const locale = await getLocale();
  if (session?.user?.role && session.user.role !== "STUDENT") {
    redirect({ href: "/dashboard", locale });
  }

  const guest = !session?.user;
  const onboardingHref = normalizeOnboardingNextHref(params.onboardingNext ?? null);
  let specialty = params.specialty?.trim() ?? "";
  let language = params.language?.trim().toUpperCase() ?? "";

  if (guest && (specialty || language)) {
    const sp = new URLSearchParams();
    if (specialty) sp.set("specialty", specialty);
    if (language) sp.set("language", language);
    const callbackPath = appPathForLocale(locale, "/book", sp);
    redirect({
      href: authSignInHref(callbackPath, "/book") as "/auth/signin",
      locale,
    });
  }

  if (guest) {
    specialty = "";
    language = "";
  }

  const viewerStudentId =
    session?.user?.id && session.user.role === "STUDENT"
      ? session.user.id
      : null;
  /*
    `select`, not `include`. This is a student browsing other people's profiles,
    and `include` returns every scalar the model has — which here means every
    listed teacher's `googleCalendarRefreshToken` was read into memory on each
    page load. Nothing rendered it, but the only thing standing between that
    token and the page was the mapping below remembering not to spread.
  */
  const teacherProfiles = await prisma.teacherProfile.findMany({
    where: marketplaceTeacherWhere(viewerStudentId),
    select: {
      id: true,
      displayName: true,
      countryOfOrigin: true,
      specialties: true,
      instructionLanguages: true,
      rateYen: true,
      offersFreeTrial: true,
      user: { select: { name: true, image: true } },
      availabilitySlots: {
        // Reserved slots count only for the student they belong to, so a
        // teacher with nothing else open does not surface as available.
        where: { active: true, ...visibleAvailabilityWhere(viewerStudentId) },
        select: {
          id: true,
          teacherLessonOffering: { select: { isFreeTrial: true } },
          // The recurrence shape, for the availability preview beside the list.
          dayOfWeek: true,
          startMin: true,
          endMin: true,
          timezone: true,
          recurrence: true,
          startsOn: true,
          endsOn: true,
        },
      },
    },
    orderBy: { userId: "asc" },
  });

  const cards = teacherProfiles.map((teacher) => ({
    id: teacher.id,
    displayName: teacher.displayName ?? teacher.user.name ?? "Teacher",
    imageUrl: teacher.user.image,
    countryOfOrigin: teacher.countryOfOrigin,
    specialties: teacher.specialties,
    instructionLanguages: teacher.instructionLanguages,
    rateYen: teacher.rateYen,
    activeAvailabilityCount: teacher.availabilitySlots.length,
    offersBookableFreeTrial: teacherHasBookableFreeTrial({
      offersFreeTrial: teacher.offersFreeTrial,
      availabilitySlots: teacher.availabilitySlots,
    }),
  }));

  // A student's own teachers head the list: they came to book their next lesson
  // with someone they already study with.
  const ownTeacherIds = new Set(
    viewerStudentId
      ? (await getStudentRosterTeachers(prisma, viewerStudentId)).map(
          (entry) => entry.teacherProfileId,
        )
      : [],
  );
  const filtered = sortOwnTeachersFirst(
    filterTeacherCards(cards, { specialty, language }),
    ownTeacherIds,
  );
  // One sign-in route for this page, shared by the guest notice above the list
  // and by the empty state below it.
  const signInHref = authSignInHref(appPathForLocale(locale, "/book"), "/book");


  /*
    The availability panel beside the list.

    The row still says "N available slots", which counts recurrence *rules* —
    not bookable times, and silent about when. This computes the real thing:
    each teacher's rules expanded across the next week, minus what is already
    taken, bucketed into four-hour bands in the **student's** timezone. For a
    Tokyo student choosing between teachers in Canada and Australia, when is
    the whole question.
  */
  const studentProfile = viewerStudentId
    ? await prisma.studentProfile.findUnique({
        where: { userId: viewerStudentId },
        select: { timezone: true },
      })
    : null;
  const viewerTimeZone = studentProfile?.timezone ?? "Asia/Tokyo";
  const days = previewDays(viewerTimeZone, locale);
  // The window is the week on screen, clamped so it never starts in the past.
  const { start: windowStart, end: windowEnd } = previewWindow(
    days.map((day) => day.dayKey),
    viewerTimeZone,
  );

  // One query for every teacher on the page, not one each: a held booking
  // takes its time off the grid, or the panel repeats the sin of the count.
  const takenBookings = await prisma.booking.findMany({
    where: {
      teacherId: { in: teacherProfiles.map((teacher) => teacher.id) },
      startsAt: { gte: windowStart, lt: windowEnd },
      ...slotHoldingBookingWhere(),
    },
    select: { teacherId: true, startsAt: true, endsAt: true },
  });
  const takenByTeacher = new Map<string, { startsAtIso: string; endsAtIso: string }[]>();
  for (const booking of takenBookings) {
    const list = takenByTeacher.get(booking.teacherId) ?? [];
    list.push({
      startsAtIso: booking.startsAt.toISOString(),
      endsAtIso: booking.endsAt.toISOString(),
    });
    takenByTeacher.set(booking.teacherId, list);
  }

  const previews: Record<string, TeacherPreview> = {};
  for (const teacher of teacherProfiles) {
    const taken = takenByTeacher.get(teacher.id) ?? [];
    const occurrences = teacher.availabilitySlots
      .flatMap((slot) =>
        expandRecurringOccurrencesInRange(
          {
            dayOfWeek: slot.dayOfWeek,
            startMin: slot.startMin,
            endMin: slot.endMin,
            timezone: slot.timezone,
            recurrence: slot.recurrence,
            startsOn: dateOnlyInZone(slot.startsOn, slot.timezone),
            endsOn: dateOnlyInZone(slot.endsOn, slot.timezone),
          },
          windowStart,
          windowEnd,
        ),
      )
      .filter((occurrence) => !taken.some((booking) => timeRangesOverlap(occurrence, booking)));

    previews[teacher.id] = {
      days,
      grid: availabilityBands({ occurrences, dayKeys: days.map((d) => d.dayKey), timeZone: viewerTimeZone }),
      profileHref: `/book/teachers/${teacher.id}`,
    };
  }

  /*
    What "nothing here" means, and the one move left from it. A guest is never
    holding a filter — the redirect above strips it — so the old single message
    blamed them for a choice they had not made, and described itself with the
    sentence already sitting at the top of the page.
  */
  const empty = browseEmptyState({ guest, filtered: Boolean(specialty || language) });
  /*
    Built once and placed twice, because where it belongs depends on whether
    there is a list. Beside a list it goes inside the list's own column, so its
    right-hand link lines up with the rows instead of drifting out over the
    availability panel's reserved width; with no list, that column does not
    exist and it spans the page.
  */
  const controls = (
    <TeacherBrowseControls
      guest={guest}
      count={filtered.length}
      signInHref={signInHref}
      specialty={specialty}
      language={language}
    />
  );
  const emptyAction = {
    clearFilters: { href: "/book", label: t("clearFilters") },
    signIn: { href: signInHref, label: tCommon("signIn") },
    dashboard: { href: "/dashboard", label: t("backToDashboard") },
  }[empty.action];

  return (
    <main className="mx-auto max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <OnboardingResumeBanner href={onboardingHref} step={params.onboardingStep ?? null} />
      <PageHeader title={t("title")} description={t("teacherBrowseSubtitle")} />
      {/* A ruled list, not a card grid: teachers are compared against each
          other, and a column of rates only lines up if the rows share an edge. */}
      {filtered.length === 0 ? (
        // The gap belongs to the column, so controls that render nothing —
        // a guest above an empty list — leave no spacing behind either.
        <div className="flex flex-col gap-8">
          {controls}
          <EmptyState
            title={t(empty.titleKey)}
            description={t(empty.bodyKey)}
            action={
              <Link
                href={emptyAction.href as "/book"}
                className={buttonClasses({ variant: "secondary" })}
              >
                {emptyAction.label}
              </Link>
            }
          />
        </div>
      ) : (
        <TeacherBrowseList previews={previews} timeZone={viewerTimeZone} header={controls}>
          {filtered.map((teacher) => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              onboardingNext={onboardingHref}
              onboardingStep={params.onboardingStep ?? null}
            />
          ))}
        </TeacherBrowseList>
      )}
    </main>
  );
}
