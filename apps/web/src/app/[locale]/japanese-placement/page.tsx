import { getTranslations } from "next-intl/server";
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
  return <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
    <OnboardingResumeBanner href={normalizeOnboardingNextHref(onboardingNext)} step={onboardingStep} />
    <h1 className="mb-4 text-2xl font-black leading-tight tracking-tight text-foreground sm:mb-5 sm:text-3xl">{t("title")}</h1>
    <JapanesePlacementAssessment />
  </main>;
}
