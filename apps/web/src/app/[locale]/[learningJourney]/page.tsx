import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LandingHero } from "@/components/marketing/landing-hero";
import { LandingHowItWorks } from "@/components/marketing/landing-how-it-works";
import { LandingPillars } from "@/components/marketing/landing-pillars";
import { LandingTrust } from "@/components/marketing/landing-trust";
import { actionLinkClass } from "@/components/ui/inline-link";
import { learningLanguageFromPath, LEARNING_JOURNEYS, journeyPath } from "@/lib/learning-journey";
import { appPathForLocale } from "@/lib/i18n-app-path";

type Props = { params: Promise<{ learningJourney: string }> };

async function subject(params: Props["params"]) {
  const language = learningLanguageFromPath(`/${(await params).learningJourney}`);
  if (!language) notFound();
  return language;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const language = await subject(params);
  const locale = await getLocale();
  const t = await getTranslations(LEARNING_JOURNEYS[language].landingNamespace);
  const path = journeyPath(language);
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: {
    canonical: appPathForLocale(locale, path), languages: { ja: path, en: `/en${path}` },
  } };
}

export default async function LearningLandingPage({ params }: Props) {
  const learningLanguage = await subject(params);
  const other = learningLanguage === "ENGLISH" ? "JAPANESE" : "ENGLISH";
  const t = await getTranslations("learningJourney");
  return (
    <main className="mx-auto flex max-w-5xl flex-1 flex-col px-4 py-12 sm:px-6">
      <LandingHero learningLanguage={learningLanguage} />
      <LandingHowItWorks learningLanguage={learningLanguage} />
      <LandingPillars learningLanguage={learningLanguage} />
      <div className="mt-16"><Link href={journeyPath(other)} className={actionLinkClass}>{t(`${LEARNING_JOURNEYS[other].key}.switch`)}</Link></div>
      <LandingTrust />
    </main>
  );
}
