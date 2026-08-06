"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Section } from "@/components/ui/section";

const legalLinkClassName =
  "font-medium text-link underline-offset-4 hover:underline";

export function TeacherMarketplaceEconomicsNotice() {
  const t = useTranslations("dashboard.settingsPage.marketplaceEconomics");

  return (
    <Section title={t("title")} description={t("intro")}>
      <Section title={t("tierTitle")} description={t("tierIntro")} size="sm" ruled={false}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              {/* Was an uppercase tracked header row — an eyebrow by another
                  name. A table header is already a header; weight says so. */}
              <tr className="border-b border-border text-sm text-muted">
                <th scope="col" className="py-2 pr-6 font-semibold">
                  {t("tierColumn")}
                </th>
                <th scope="col" className="py-2 font-semibold">
                  {t("feeColumn")}
                </th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              {(["tier1Schedule", "tier2Schedule", "tier3Schedule"] as const).map((key, i) => (
                <tr key={key} className="border-b border-border">
                  <th scope="row" className="py-2.5 pr-6 text-left font-bold">
                    Tier {i + 1}
                  </th>
                  <td className="py-2.5">{t(key)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">{t("tierReviewNote")}</p>
      </Section>

      <Section title={t("refundTitle")} size="sm" className="mt-8">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
          <li>{t("refundPlatformFee")}</li>
          <li>{t("refundTeacherDefault")}</li>
          <li>{t("refundPassThrough")}</li>
          <li>{t("refundTeacherCancel")}</li>
        </ul>
        <p className="mt-3 text-sm text-muted">
          {t("refundDocsPrefix")}{" "}
          <Link
            href="/legal/terms/teachers"
            target="_blank"
            rel="noopener noreferrer"
            className={legalLinkClassName}
          >
            {t("refundDocsTeacherTermsLink")}
          </Link>{" "}
          {t("refundDocsJoiner")}{" "}
          <Link
            href="/legal/refund/teachers"
            target="_blank"
            rel="noopener noreferrer"
            className={legalLinkClassName}
          >
            {t("refundDocsRefundLink")}
          </Link>
          {t("refundDocsSuffix")}
        </p>
      </Section>
    </Section>
  );
}
