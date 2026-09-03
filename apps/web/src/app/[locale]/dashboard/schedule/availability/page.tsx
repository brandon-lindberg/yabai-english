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
import { buttonClasses } from "@/components/ui/button";
import { ensureFreeTrialOffering } from "@/lib/free-trial-offering-sync";

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

  // `select`, not `include`: this page needs none of the profile's scalars
  // beyond the two below, and `include` was reading the refresh token with them.
  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      paymentPolicyAcceptedAt: true,
      offersFreeTrial: true,
      availabilitySlots: {
        where: { active: true },
        orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }],
        include: {
          classLevel: { select: { id: true, code: true, labelEn: true, labelJa: true } },
          classType: { select: { id: true, code: true, labelEn: true, labelJa: true } },
          // Only this teacher's own editor loads the name; every student-facing
          // query selects the id at most, and only ever their own.
          assignedStudent: { select: { name: true, email: true } },
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
        select: { slotId: true, startsAtIso: true },
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

  // The picker offers a slot's class from the teacher's offerings, so the trial
  // has to exist before the editor renders or there is nothing to select.
  await ensureFreeTrialOffering(prisma, {
    teacherId: profile.id,
    offersFreeTrial: profile.offersFreeTrial,
  });

  const teacherBookings = await getTeacherBookingsForDashboard(prisma, profile.id);
  const publishAvailabilityOptions = resolveTeacherPublishAvailabilityOptions();
  const canPublishAvailability = canTeacherPublishAvailability(
    profile.paymentPolicyAcceptedAt,
    profile.paymentAccounts,
    publishAvailabilityOptions,
  );

  // A slot can only be reserved for one of this teacher's own students, so the
  // picker offers exactly the working roster.
  const assignableStudents = (
    await prisma.teacherRosterEntry.findMany({
      where: { teacherId: profile.id, studentId: { not: null }, archivedAt: null },
      select: { studentId: true, student: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    })
  ).map((entry) => ({
    id: entry.studentId!,
    label: entry.student?.name ?? entry.student?.email ?? entry.studentId!,
  }));

  return (
    <div className="space-y-8">
      <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />

      {canPublishAvailability ? (
        <TeacherAvailabilityCalendar
          assignableStudents={assignableStudents}
          initialSlots={profile.availabilitySlots.map((slot) => ({
            id: slot.id,
            dayOfWeek: slot.dayOfWeek,
            startMin: slot.startMin,
            endMin: slot.endMin,
            assignedStudentId: slot.assignedStudentId,
            assignedStudentName:
              slot.assignedStudent?.name ?? slot.assignedStudent?.email ?? null,
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
          initialOccurrenceSkips={profile.availabilityOccurrenceSkips}
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
            lessonLabel: `${b.lessonProduct.nameJa} / ${b.lessonProduct.nameEn}`,
            durationMin: b.lessonProduct.durationMin,
            priceYen: b.quotedPriceYen,
            status: b.status,
            meetUrl: b.meetUrl,
            groupSeats: b.groupLessonSession
              ? {
                  capacity: b.groupLessonSession.capacity,
                  taken: b.groupLessonSession._count.bookings,
                }
              : null,
            classmates: b.groupLessonSession
              ? teacherBookings.bookings
                  .filter(
                    (other) =>
                      other.groupLessonSessionId === b.groupLessonSessionId &&
                      other.status !== "CANCELLED",
                  )
                  .map((other) => other.student.name ?? other.student.email ?? "Student")
              : undefined,
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
              className={buttonClasses({ size: "lg" })}
            >
              {t("availabilityPaymentRequiredCta")}
            </Link>
          </div>
        </AppCard>
      )}
    </div>
  );
}
