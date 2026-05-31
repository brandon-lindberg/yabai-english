import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link, redirect } from "@/i18n/navigation";
import { TeacherAvailabilityCalendar } from "@/components/dashboard/teacher-availability-calendar";
import { AppCard } from "@/components/ui/app-card";
import { PaymentPolicyNotice } from "@/components/payment-policy-notice";
import { getTeacherBookingsForDashboard } from "@/lib/dashboard/teacher-bookings";
import {
  canTeacherPublishAvailability,
  resolveTeacherPublishAvailabilityOptions,
} from "@/lib/payment-methods";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";
import { dateOnlyInZone } from "@/lib/date-only-in-zone";

export default async function DashboardScheduleAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ onboardingNext?: string; onboardingStep?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Only users with a teacher profile manage availability — same scope as schedule teacher view.
  if (session.user.role === "STUDENT") {
    const locale = await getLocale();
    redirect({ href: "/dashboard/schedule", locale });
  }

  const t = await getTranslations("dashboard.schedulePage");
  const { onboardingNext, onboardingStep } = await searchParams;
  const onboardingHref = normalizeOnboardingNextHref(onboardingNext ?? null);

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      availabilitySlots: {
        where: { active: true },
        orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }],
        include: {
          classLevel: { select: { id: true, code: true, labelEn: true, labelJa: true } },
          classType: { select: { id: true, code: true, labelEn: true, labelJa: true } },
        },
      },
      lessonOfferings: {
        where: { active: true },
        orderBy: [{ isGroup: "asc" }, { durationMin: "asc" }, { rateYen: "asc" }],
        include: {
          classLevel: { select: { id: true, code: true, labelEn: true, labelJa: true } },
          classType: { select: { id: true, code: true, labelEn: true, labelJa: true } },
        },
      },
      availabilityOccurrenceSkips: {
        select: { startsAtIso: true },
      },
      paymentAccounts: {
        select: {
          id: true,
          provider: true,
          providerAccountId: true,
          status: true,
          chargesEnabled: true,
          payoutsEnabled: true,
          methods: { select: { method: true, enabled: true } },
        },
      },
      classLevels: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }],
        select: { id: true, code: true, labelEn: true, labelJa: true },
      },
      classTypes: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }],
        select: { id: true, code: true, labelEn: true, labelJa: true },
      },
    },
  });

  if (!profile) {
    const locale = await getLocale();
    redirect({ href: "/dashboard/schedule", locale });
    return null;
  }

  const teacherBookings = await getTeacherBookingsForDashboard(prisma, profile.id);
  const publishAvailabilityOptions = resolveTeacherPublishAvailabilityOptions();
  const canPublishAvailability = canTeacherPublishAvailability(
    profile.paymentPolicyAcceptedAt,
    profile.paymentAccounts,
    publishAvailabilityOptions,
  );

  return (
    <div className="space-y-8">
      <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />
      <p className="text-muted">{t("availabilityIntro")}</p>

      {canPublishAvailability ? (
        <TeacherAvailabilityCalendar
          initialSlots={profile.availabilitySlots.map((slot) => ({
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
            teacherLessonOfferingId: slot.teacherLessonOfferingId,
            classLevel: slot.classLevel,
            classType: slot.classType,
          }))}
          initialOccurrenceSkips={profile.availabilityOccurrenceSkips.map((s) => s.startsAtIso)}
          defaultTimezone={profile.availabilitySlots[0]?.timezone ?? "Asia/Tokyo"}
          classLevels={profile.classLevels}
          classTypes={profile.classTypes}
          lessonOfferings={profile.lessonOfferings}
          bookings={teacherBookings.bookings
            .filter((b) => b.status !== "CANCELLED")
            .map((b) => ({
            id: b.id,
            startsAtIso: b.startsAt.toISOString(),
            endsAtIso: b.endsAt.toISOString(),
            studentLabel: b.student.name ?? b.student.email ?? "Student",
          }))}
        />
      ) : (
        <AppCard>
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {t("availabilityPaymentRequiredTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {t("availabilityPaymentRequiredBody")}
              </p>
            </div>
            <PaymentPolicyNotice audience="teacher" />
            <Link
              href="/dashboard/settings?tab=payments"
              className="inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {t("availabilityPaymentRequiredCta")}
            </Link>
          </div>
        </AppCard>
      )}
    </div>
  );
}
