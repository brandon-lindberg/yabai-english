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
import { AppCard } from "@/components/ui/app-card";
import { InlineAlert } from "@/components/ui/inline-alert";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";
import { buildLocalizedTeacherProfilePath } from "@/lib/teacher-card-href";
import { resolveSafeCallbackUrl } from "@/lib/auth-callback-url";
import { GuestBookLessonCta } from "@/components/booking/guest-book-lesson-cta";
import { studentMayAccessTeacherBookingFlow } from "@/lib/teacher-marketplace-booking-access";
import { dateOnlyInZone } from "@/lib/date-only-in-zone";
import { getEnabledTeacherPaymentMethods } from "@/lib/payment-methods";
import { PaymentMethodLogos } from "@/components/payment-method-logos";

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

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    include: {
      user: {
        include: {
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
        include: {
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
      paymentAccounts: {
        select: {
          id: true,
          provider: true,
          status: true,
          chargesEnabled: true,
          payoutsEnabled: true,
          methods: { select: { method: true, enabled: true } },
        },
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
  const paymentMethods = teacher.paymentPolicyAcceptedAt
    ? getEnabledTeacherPaymentMethods(teacher.paymentAccounts)
    : [];

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

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <AppCard>
          <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-background text-sm text-muted">
            {teacher.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={teacher.user.image} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              displayName.slice(0, 2).toUpperCase()
            )}
          </div>
          {teacher.credentials ? (
            <p className="text-sm text-foreground">{teacher.credentials}</p>
          ) : null}
          {teacher.bio ? <p className="mt-2 text-sm text-muted">{teacher.bio}</p> : null}
          {teacher.specialties.length > 0 ? (
            <p className="mt-3 text-sm text-muted">
              {t("teacherSpecialties")}: {teacher.specialties.join(" · ")}
            </p>
          ) : null}
          <p className="mt-3 text-sm font-medium text-foreground">
            {t("teacherRateIndividual")}: {formatYenRange(individualRateRange)}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {t("teacherRateGroup")}: {formatYenRange(groupRateRange)}
          </p>
          <PaymentMethodLogos methods={paymentMethods} className="mt-4" />
        </AppCard>

        <AppCard>
          <h2 className="text-base font-semibold text-foreground">{t("availability")}</h2>
          <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {teacher.availabilitySlots.length === 0 ? (
              <li className="text-sm text-muted">{t("noAvailabilityYet")}</li>
            ) : (
              teacher.availabilitySlots.map((slot) => (
                <li key={slot.id} className="text-sm text-muted">
                  {weekdayLabel(slot.dayOfWeek, locale)} ·{" "}
                  {String(Math.floor(slot.startMin / 60)).padStart(2, "0")}:
                  {String(slot.startMin % 60).padStart(2, "0")} -{" "}
                  {String(Math.floor(slot.endMin / 60)).padStart(2, "0")}:
                  {String(slot.endMin % 60).padStart(2, "0")} ({slot.timezone}) ·{" "}
                  {formatSlotMeta(slot)}
                </li>
              ))
            )}
          </ul>
        </AppCard>
      </div>

      {session?.user ? (
        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{t("scheduleWithTeacher")}</h2>
          <p className="text-sm text-muted">
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
        </section>
      ) : (
        <GuestBookLessonCta callbackUrl={postSignInBookingPath} />
      )}
    </main>
  );
}
