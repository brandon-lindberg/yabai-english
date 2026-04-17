import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/onboarding-gate";
import { getStudentPostOnboardingRoute } from "@/lib/onboarding-routing";
import { OnboardingForm } from "@/components/onboarding-form";
import { PageHeader } from "@/components/ui/page-header";

export default async function OnboardingPage() {
  const t = await getTranslations("onboarding");
  const locale = await getLocale();
  const user = await requireAuth(locale);

  if (user.role === "TEACHER") {
    redirect({ href: "/onboarding/teacher", locale });
  }
  if (user.role !== "STUDENT") {
    redirect({ href: "/dashboard", locale });
  }

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
      href: getStudentPostOnboardingRoute(profile.placedLevel ?? "UNSET"),
      locale,
    });
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="mt-8">
        <OnboardingForm initialTimezone={profile?.timezone ?? "Asia/Tokyo"} />
      </div>
    </main>
  );
}
