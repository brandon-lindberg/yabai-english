import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LegalDocument } from "@/components/legal/legal-document";
import { isLegalLocale, loadLegalMarkdown } from "@/lib/legal/load-legal-markdown";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: t("termsPageTitle"),
    description: t("termsMetaDescription"),
  };
}

export default async function TermsOfServicePage() {
  const locale = await getLocale();
  const t = await getTranslations("legal");
  const legalLocale = isLegalLocale(locale) ? locale : "ja";
  const markdown = await loadLegalMarkdown("terms", legalLocale);

  return (
    <div>
      <LegalDocument markdown={markdown} />
      <p className="mt-12 max-w-3xl border-t border-border pt-6 text-xs leading-relaxed text-muted">
        {t("footerNotice")}
      </p>
    </div>
  );
}
