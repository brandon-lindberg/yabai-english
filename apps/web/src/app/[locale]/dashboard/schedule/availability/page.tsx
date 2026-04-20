import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "@/i18n/navigation";
import { TeacherAvailabilityCalendar } from "@/components/dashboard/teacher-availability-calendar";
import { getTeacherBookingsForDashboard } from "@/lib/dashboard/teacher-bookings";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";

export default async function DashboardScheduleAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ onboardingNext?: string; onboardingStep?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Only teachers have availability — redirect students back to schedule.
  if (session.user.role !== "TEACHER") {
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
      },
      availabilityOccurrenceSkips: {
        select: { startsAtIso: true },
      },
    },
  });

  const teacherBookings = profile
    ? await getTeacherBookingsForDashboard(prisma, profile.id)
    : { bookings: [], upcoming: [], completed: [], scheduleItems: [] };

  return (
    <div className="space-y-8">
      <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />
      <p className="text-muted">{t("availabilityIntro")}</p>

      <TeacherAvailabilityCalendar
        initialSlots={(profile?.availabilitySlots ?? []).map((slot) => ({
          id: slot.id,
          dayOfWeek: slot.dayOfWeek,
          startMin: slot.startMin,
          endMin: slot.endMin,
          timezone: slot.timezone,
          lessonLevel: slot.lessonLevel,
          lessonType: slot.lessonType,
          lessonTypeCustom: slot.lessonTypeCustom ?? null,
        }))}
        initialOccurrenceSkips={
          profile?.availabilityOccurrenceSkips?.map((s) => s.startsAtIso) ?? []
        }
        defaultTimezone={profile?.availabilitySlots?.[0]?.timezone ?? "Asia/Tokyo"}
        bookings={teacherBookings.upcoming.map((b) => ({
          id: b.id,
          startsAtIso: b.startsAt.toISOString(),
          endsAtIso: b.endsAt.toISOString(),
          studentLabel: b.student.name ?? b.student.email ?? "Student",
        }))}
      />
    </div>
  );
}
