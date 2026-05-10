import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { TeacherLessonOfferingsForm } from "@/components/dashboard/teacher-lesson-offerings-form";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";

export default async function DashboardLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ onboardingNext?: string; onboardingStep?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  if (!isTeacherCabinetRole(session.user.role)) {
    const locale = await getLocale();
    redirect({ href: "/dashboard", locale });
  }

  const t = await getTranslations("dashboard.lessonOfferingsPage");
  const { onboardingNext, onboardingStep } = await searchParams;
  const onboardingHref = normalizeOnboardingNextHref(onboardingNext ?? null);

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      rateYen: true,
      offersFreeTrial: true,
      lessonOfferings: {
        where: { active: true },
        orderBy: [{ isGroup: "asc" }, { durationMin: "asc" }],
        select: {
          id: true,
          durationMin: true,
          rateYen: true,
          isGroup: true,
          groupSize: true,
          classLevelId: true,
          classTypeId: true,
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

  return (
    <div className="space-y-6">
      <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />
      <header>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("intro")}</p>
      </header>
      <TeacherLessonOfferingsForm
        initialRateYen={profile?.rateYen ?? null}
        initialOffersFreeTrial={profile?.offersFreeTrial ?? true}
        initialLessonOfferings={profile?.lessonOfferings ?? []}
        classLevels={profile?.classLevels ?? []}
        classTypes={profile?.classTypes ?? []}
      />
    </div>
  );
}
