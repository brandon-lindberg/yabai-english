"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const legalLinkClassName =
  "font-medium text-link underline-offset-4 hover:underline";

export function TeacherMarketplaceEconomicsNotice() {
  const t = useTranslations("dashboard.settingsPage.marketplaceEconomics");

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">{t("title")}</h3>
        <p className="mt-1 text-sm text-muted">{t("intro")}</p>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-foreground">{t("tierTitle")}</h4>
        <p className="mt-1 text-sm text-muted">{t("tierIntro")}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4 font-semibold">{t("tierColumn")}</th>
                <th className="py-2 font-semibold">{t("feeColumn")}</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              <tr className="border-b border-border">
                <td className="py-2 pr-4 font-medium">Tier 1</td>
                <td className="py-2">{t("tier1Schedule")}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pr-4 font-medium">Tier 2</td>
                <td className="py-2">{t("tier2Schedule")}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium">Tier 3</td>
                <td className="py-2">{t("tier3Schedule")}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">{t("tierReviewNote")}</p>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-foreground">{t("refundTitle")}</h4>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
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
      </div>
    </section>
  );
}
