import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/onboarding-gate";
import { getStudentPostOnboardingRoute } from "@/lib/onboarding-routing";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const t = await getTranslations("onboarding");
  const locale = await getLocale();
  const user = await requireAuth(locale);

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
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("subtitle")}</p>
      <div className="mt-6">
        <OnboardingForm initialTimezone={profile?.timezone ?? "Asia/Tokyo"} />
      </div>
    </main>
  );
}
