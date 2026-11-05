import { requireLearningSiteForPage } from "@/lib/learning-site-page";
import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/onboarding-gate";
import { getStudentPostOnboardingRoute } from "@/lib/onboarding-routing";
import { OnboardingForm } from "@/components/onboarding-form";
import { PageHeader } from "@/components/ui/page-header";
import { LEARNING_JOURNEYS } from "@/lib/learning-journey";

export default async function OnboardingPage() {
  const t = await getTranslations("onboarding");
  const locale = await getLocale();
  const user = await requireAuth(locale);
  const j = await getTranslations("learningJourney");

  if (user.role === "TEACHER") {
    redirect({ href: "/onboarding/teacher", locale });
  }
  if (user.role !== "STUDENT") {
    redirect({ href: "/dashboard", locale });
  }

  await requireLearningSiteForPage("/onboarding", user.learningLanguage);
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: {
      onboardingCompletedAt: true,
      timezone: true,
      placedLevel: true,
    },
  });

  if (profile?.onboardingCompletedAt) {
    redirect({
      href: getStudentPostOnboardingRoute(profile.placedLevel ?? "UNSET", user.learningLanguage),
      locale,
    });
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <PageHeader title={j(`${LEARNING_JOURNEYS[user.learningLanguage].key}.onboarding`)} description={t("subtitle")} />
      <div className="mt-8">
        <OnboardingForm initialTimezone={profile?.timezone ?? "Asia/Tokyo"} learningLanguage={user.learningLanguage} />
      </div>
    </main>
  );
}
