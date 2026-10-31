import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { JapanesePlacementAssessment } from "@/components/japanese-placement/assessment";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";

export async function generateMetadata() {
  const t = await getTranslations("japanesePlacement");
  return { title: t("title") };
}
export default async function JapanesePlacementPage({ searchParams }: {
  searchParams: Promise<{ onboardingNext?: string; onboardingStep?: string }>;
}) {
  const t = await getTranslations("japanesePlacement");
  const { onboardingNext, onboardingStep } = await searchParams;
  return <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
    <OnboardingResumeBanner href={normalizeOnboardingNextHref(onboardingNext)} step={onboardingStep} />
    <PageHeader title={t("title")} description={t("pageIntro")} />
    <JapanesePlacementAssessment />
  </main>;
}
