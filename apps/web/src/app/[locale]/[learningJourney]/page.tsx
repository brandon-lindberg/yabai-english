import { LearningLanding } from "@/components/marketing/learning-landing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
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
  return <LearningLanding learningLanguage={await subject(params)} />;
}
