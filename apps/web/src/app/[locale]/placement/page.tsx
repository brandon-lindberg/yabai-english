import { getTranslations } from "next-intl/server";
import { PlacementQuiz } from "@/components/placement-quiz";
import { PageHeader } from "@/components/ui/page-header";
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
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
      <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />
      <PageHeader title={t("title")} />
      <PlacementQuiz />
    </main>
  );
}
