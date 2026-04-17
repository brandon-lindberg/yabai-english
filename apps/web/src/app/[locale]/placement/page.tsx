import { getTranslations } from "next-intl/server";
import { PlacementQuiz } from "@/components/placement-quiz";
import { PageHeader } from "@/components/ui/page-header";
import { AppCard } from "@/components/ui/app-card";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";

type Props = {
  searchParams: Promise<{ onboardingNext?: string; onboardingStep?: string }>;
};

export default async function PlacementPage({ searchParams }: Props) {
  const t = await getTranslations("placement");
  const { onboardingNext, onboardingStep } = await searchParams;
  const onboardingHref = normalizeOnboardingNextHref(onboardingNext ?? null);

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />
      <PageHeader title={t("title")} description={t("pageIntro")} />
      <AppCard className="mt-8">
        <PlacementQuiz />
      </AppCard>
    </main>
  );
}
