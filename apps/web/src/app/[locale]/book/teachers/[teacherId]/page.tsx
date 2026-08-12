import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { BookingForm } from "@/components/booking-form";
import { buildUpcomingSlotOptions } from "@/lib/availability";
import { auth } from "@/auth";
import { weekdayLabel } from "@/lib/weekdays";
import { redirectTargetForTeacherBookingPage } from "@/lib/teacher-booking-page-access";
import { formatYenRange, getTeacherRateRangeByType } from "@/lib/teacher-rate-range";
import { redirect } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Section } from "@/components/ui/section";
import { StatLedger } from "@/components/ui/stat-ledger";
import { DataList, DataRow } from "@/components/ui/data-row";
import { InlineAlert } from "@/components/ui/inline-alert";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";
import { buildLocalizedTeacherProfilePath } from "@/lib/teacher-card-href";
import { resolveSafeCallbackUrl } from "@/lib/auth-callback-url";
import { GuestBookLessonCta } from "@/components/booking/guest-book-lesson-cta";
import { studentMayAccessTeacherBookingFlow } from "@/lib/teacher-marketplace-booking-access";
import { dateOnlyInZone } from "@/lib/date-only-in-zone";

type Props = {
  params: Promise<{ teacherId: string }>;
  searchParams: Promise<{ onboardingNext?: string; onboardingStep?: string }>;
};

export default async function TeacherProfileBookingPage({
  params,
  searchParams,
}: Props) {
  const t = await getTranslations("booking");
  const locale = await getLocale();
  const isJa = locale.toLowerCase().startsWith("ja");
  const localized = (entry: { labelEn: string; labelJa: string | null } | null) =>
    entry ? (isJa ? (entry.labelJa ?? entry.labelEn) : entry.labelEn) : "";
  const formatSlotMeta = (slot: {
    classLevel: { labelEn: string; labelJa: string | null } | null;
    classType: { labelEn: string; labelJa: string | null } | null;
  }) =>
    [localized(slot.classLevel), localized(slot.classType)]
      .filter(Boolean)
      .join(" · ");
  const { teacherId } = await params;
  const { onboardingNext, onboardingStep } = await searchParams;
  const onboardingHref = normalizeOnboardingNextHref(onboardingNext ?? null);
  const session = await auth();

  const viewerTeacherProfileId =
    session?.user?.role === "TEACHER"
      ? (
          await prisma.teacherProfile.findUnique({
            where: { userId: session.user.id },
            select: { id: true },
          })
        )?.id ?? null
      : null;

  const redirectHref = redirectTargetForTeacherBookingPage({
    role: session?.user?.role,
    requestedTeacherProfileId: teacherId,
    viewerTeacherProfileId,
  });
  if (redirectHref) {
    redirect({ href: redirectHref, locale });
  }

  /*
    `select`, not `include`: a student viewing someone else's profile has no
    business loading that teacher's `googleCalendarRefreshToken`, which is what
    `include` returned. Same reason `user` is narrowed — `include` there pulled
    the teacher's email and account status into the page's data as well.
  */
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      userId: true,
      displayName: true,
      bio: true,
      credentials: true,
      countryOfOrigin: true,
      specialties: true,
      instructionLanguages: true,
      rateYen: true,
      marketplaceHidden: true,
      user: {
        select: {
          name: true,
          image: true,
          organizationMemberships: {
            where: { status: "ACTIVE" },
            select: { id: true },
            take: 1,
          },
        },
      },
      availabilitySlots: {
        where: { active: true },
        orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }],
        select: {
          id: true,
          dayOfWeek: true,
          startMin: true,
          endMin: true,
          timezone: true,
          recurrence: true,
          startsOn: true,
          endsOn: true,
          classLevelId: true,
          classTypeId: true,
          classLevel: { select: { labelEn: true, labelJa: true } },
          classType: { select: { labelEn: true, labelJa: true } },
        },
      },
      availabilityOccurrenceSkips: {
        select: { startsAtIso: true },
      },
      lessonOfferings: {
        where: { active: true },
        select: { active: true, rateYen: true, isGroup: true },
      },
    },
  });

  if (!teacher) notFound();
  if (teacher.user.organizationMemberships.length > 0) notFound();

  const viewerStudentId =
    session?.user?.role === "STUDENT" ? session.user.id : null;
  if (teacher.marketplaceHidden) {
    const onRoster =
      viewerStudentId &&
      (await prisma.teacherRosterEntry.findFirst({
        where: { teacherId: teacher.id, studentId: viewerStudentId },
        select: { id: true },
      }));
    if (
      !studentMayAccessTeacherBookingFlow({
        marketplaceHidden: true,
        viewerStudentId,
        isStudentOnRoster: Boolean(onRoster),
      })
    ) {
      notFound();
    }
  }

  // Only fetch timing for taken slots. Never select student identity fields
  // so no booker's name/email can leak to other students on this page.
  const reservedBookings = await prisma.booking.findMany({
    where: {
      teacherId: teacher.id,
      status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
      startsAt: { gte: new Date() },
    },
    select: {
      startsAt: true,
      endsAt: true,
    },
    orderBy: { startsAt: "asc" },
  });

  const displayName = teacher.displayName ?? teacher.user.name ?? "Teacher";
  if (session?.user?.id && session.user.role === "STUDENT") {
    const hiddenByTeacher = await prisma.chatThread.findFirst({
      where: {
        studentId: session.user.id,
        teacherId: teacher.userId,
        teacherBlockedAt: { not: null },
      },
      select: { id: true },
    });
    if (hiddenByTeacher) {
      notFound();
    }
  }
  const studentProfile = session?.user?.id
    ? await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        select: { timezone: true },
      })
    : null;
  const viewerTimezone = studentProfile?.timezone ?? "Asia/Tokyo";
  const skippedStartsAtIso = new Set(
    teacher.availabilityOccurrenceSkips.map((s) => s.startsAtIso),
  );
  const slotMetaById = new Map<string, string>();
  for (const slot of teacher.availabilitySlots) {
    slotMetaById.set(slot.id, formatSlotMeta(slot));
  }
  const slotOptions = buildUpcomingSlotOptions({
    availabilitySlots: teacher.availabilitySlots.map((slot) => ({
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      startMin: slot.startMin,
      endMin: slot.endMin,
      timezone: slot.timezone,
      recurrence: slot.recurrence,
      startsOn: dateOnlyInZone(slot.startsOn, slot.timezone),
      endsOn: dateOnlyInZone(slot.endsOn, slot.timezone),
      classLevelId: slot.classLevelId,
      classTypeId: slot.classTypeId,
    })),
    viewerTimezone,
    minimumLeadHours: 48,
    skippedStartsAtIso,
    formatLessonMeta: (slot) => slotMetaById.get(slot.id) ?? "",
  });

  const subtitle = `${teacher.countryOfOrigin ?? "—"} · ${teacher.instructionLanguages.join(", ")}`;
  const individualRateRange = getTeacherRateRangeByType(
    teacher.lessonOfferings,
    "individual",
    teacher.rateYen,
  );
  const groupRateRange = getTeacherRateRangeByType(teacher.lessonOfferings, "group");
  const postSignInBookingPath = resolveSafeCallbackUrl(
    buildLocalizedTeacherProfilePath(
      locale,
      teacherId,
      onboardingHref,
      onboardingStep ?? null,
    ),
    "/book",
  );

  return (
    <main className="mx-auto max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />
      <PageHeader title={displayName} description={subtitle} />

      {/* Two cards side by side made the teacher's identity and their hours read
          as separate products. They are one page about one person: a portrait
          block, then the rates as figures, then the hours as a ruled list. */}
      <div className="mt-8 flex flex-wrap items-start gap-6">
        <Avatar src={teacher.user.image} name={displayName} size="lg" />
        <div className="min-w-0 flex-1 space-y-2">
          {teacher.credentials ? (
            <p className="text-base text-foreground">{teacher.credentials}</p>
          ) : null}
          {teacher.bio ? (
            <p className="max-w-[62ch] leading-relaxed text-muted">{teacher.bio}</p>
          ) : null}
          {teacher.specialties.length > 0 ? (
            <p className="text-sm text-muted">
              {t("teacherSpecialties")}: {teacher.specialties.join(" · ")}
            </p>
          ) : null}
        </div>
      </div>

      {/* Rates are what a student is here to compare, so they carry themselves
          at figure scale instead of hiding in a sentence. */}
      <StatLedger
        className="mt-8"
        size="sm"
        stats={[
          { label: t("teacherRateIndividual"), value: formatYenRange(individualRateRange) },
          { label: t("teacherRateGroup"), value: formatYenRange(groupRateRange) },
        ]}
      />

      <Section title={t("availability")} className="mt-10">
        {teacher.availabilitySlots.length === 0 ? (
          <p className="border-y border-border py-6 text-sm text-muted">{t("noAvailabilityYet")}</p>
        ) : (
          <DataList className="max-h-80 overflow-y-auto">
            {teacher.availabilitySlots.map((slot) => (
              <DataRow key={slot.id}>
                <p className="text-sm font-semibold text-foreground">
                  {weekdayLabel(slot.dayOfWeek, locale)}{" "}
                  <span className="tabular-nums">
                    {String(Math.floor(slot.startMin / 60)).padStart(2, "0")}:
                    {String(slot.startMin % 60).padStart(2, "0")} –{" "}
                    {String(Math.floor(slot.endMin / 60)).padStart(2, "0")}:
                    {String(slot.endMin % 60).padStart(2, "0")}
                  </span>
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {[slot.timezone, formatSlotMeta(slot)].filter(Boolean).join(" · ")}
                </p>
              </DataRow>
            ))}
          </DataList>
        )}
      </Section>

      {session?.user ? (
        <Section title={t("scheduleWithTeacher")} size="lg" className="mt-10">
          <p className="mb-4 text-sm text-muted">
            {t("selectSlot")} · {t("timezoneShownAs")}: {viewerTimezone}
          </p>
          <InlineAlert variant="warning">{t("leadTimeNotice")}</InlineAlert>
          <BookingForm
            teacherProfileId={teacher.id}
            currentUserRole={session.user.role}
            viewerTimezone={viewerTimezone}
            presetSlots={slotOptions.map((slot) => ({
              startsAtIso: slot.startsAtIso,
              endsAtIso: slot.endsAtIso,
              label: slot.label,
              groupKey: slot.slotId,
              classTypeId: slot.classTypeId,
            }))}
            bookedSlots={reservedBookings.map((b) => ({
              startsAtIso: b.startsAt.toISOString(),
              endsAtIso: b.endsAt.toISOString(),
            }))}
          />
        </Section>
      ) : (
        <GuestBookLessonCta callbackUrl={postSignInBookingPath} />
      )}
    </main>
  );
}
