import { getLocale, getTranslations } from "next-intl/server";
import type { LearningLanguage } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { LandingHero } from "@/components/marketing/landing-hero";
import { LandingHowItWorks } from "@/components/marketing/landing-how-it-works";
import { LandingPillars } from "@/components/marketing/landing-pillars";
import { LandingTrust } from "@/components/marketing/landing-trust";
import { actionLinkClass } from "@/components/ui/inline-link";
import { LEARNING_JOURNEYS, journeyPath } from "@/lib/learning-journey";
import { configuredLearningSites, learningSiteHref } from "@/lib/learning-sites";
import { appPathForLocale } from "@/lib/i18n-app-path";

export async function LearningLanding({ learningLanguage }: { learningLanguage: LearningLanguage }) {
  const other = learningLanguage === "ENGLISH" ? "JAPANESE" : "ENGLISH";
  const sites = configuredLearningSites();
  const locale = await getLocale();
  const otherHref = sites ? learningSiteHref(sites, other, appPathForLocale(locale, "/")) : journeyPath(other);
  const t = await getTranslations("learningJourney");
  return (
    <main className="mx-auto flex max-w-5xl flex-1 flex-col px-4 py-12 sm:px-6">
      <LandingHero learningLanguage={learningLanguage} />
      <LandingHowItWorks learningLanguage={learningLanguage} />
      <LandingPillars learningLanguage={learningLanguage} />
      <div className="mt-16"><Link href={otherHref} className={actionLinkClass}>{t(`${LEARNING_JOURNEYS[other].key}.switch`)}</Link></div>
      <LandingTrust />
    </main>
  );
}
