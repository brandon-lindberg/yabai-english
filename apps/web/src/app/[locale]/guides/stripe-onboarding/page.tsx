import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LegalDocument } from "@/components/legal/legal-document";
import { isGuideLocale, loadGuideMarkdown } from "@/lib/guides/load-guide-markdown";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "guides" });
  return {
    title: t("stripeOnboardingPageTitle"),
    description: t("stripeOnboardingMetaDescription"),
  };
}

export default async function StripeOnboardingGuidePage() {
  const locale = await getLocale();
  const t = await getTranslations("guides");
  const guideLocale = isGuideLocale(locale) ? locale : "ja";
  const markdown = await loadGuideMarkdown("stripe-onboarding", guideLocale);

  return (
    <div>
      <LegalDocument markdown={markdown} />
      <p className="mt-12 max-w-3xl border-t border-border pt-6 text-xs leading-relaxed text-muted">
        {t("stripeOnboardingFooterNotice")}
      </p>
    </div>
  );
}
