import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "@/i18n/navigation";
import { TeacherAvailabilityCalendar } from "@/components/dashboard/teacher-availability-calendar";
import { getTeacherBookingsForDashboard } from "@/lib/dashboard/teacher-bookings";
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

  return (
    <div className="space-y-8">
      <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />
      <p className="text-muted">{t("availabilityIntro")}</p>

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
    </div>
  );
}
