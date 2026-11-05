import { configuredLearningSites, learningSiteHref } from "@/lib/learning-sites";
import { appPathForLocale } from "@/lib/i18n-app-path";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LEARNING_JOURNEYS, journeySignInHref } from "@/lib/learning-journey";
import { StormField } from "@/components/marketing/storm-field";

export async function LearningChoice({ forSignIn = false, callbackUrl = "/book" }: { forSignIn?: boolean; callbackUrl?: string } = {}) {
  const sites = configuredLearningSites();
  const locale = await getLocale();
  const t = await getTranslations("learningJourney");
  return (
    <main className="relative isolate mx-auto flex max-w-5xl flex-1 flex-col px-4 py-16 sm:px-6 sm:py-24">
      <StormField count={45} />
      <div className="relative">
        <h1 className="max-w-[15ch] text-[clamp(2.75rem,8vw,6rem)] font-black leading-[0.98] tracking-[-0.04em]">{t("choiceTitle")}</h1>
        <p className="mt-7 max-w-[62ch] text-lg leading-relaxed text-muted">{t("choiceIntro")}</p>
        <ul className="mt-12 border-t border-border">
          {Object.entries(LEARNING_JOURNEYS).map(([language, journey]) => (
            <li key={journey.key} className="border-b border-border">
              <Link href={sites ? learningSiteHref(sites, language as keyof typeof LEARNING_JOURNEYS, appPathForLocale(locale, forSignIn ? journeySignInHref(language as keyof typeof LEARNING_JOURNEYS, callbackUrl) : "/")) : forSignIn ? journeySignInHref(language as keyof typeof LEARNING_JOURNEYS, callbackUrl) : journey.path} className="block py-7 transition-colors hover:bg-[var(--app-hover)] sm:py-9">
                <span className="text-2xl font-bold tracking-[-0.03em] sm:text-4xl">{t(`${journey.key}.choose`)}</span>
                <span className="mt-2 block max-w-[62ch] text-base text-muted">{t(`${journey.key}.intro`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
