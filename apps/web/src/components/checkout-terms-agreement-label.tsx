"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const legalLinkClassName =
  "font-medium text-link underline-offset-4 hover:underline";

export function CheckoutTermsAgreementLabel() {
  const t = useTranslations("booking");

  return (
    <span className="leading-relaxed">
      {t("acceptCheckoutTermsPrefix")}{" "}
      <Link
        href="/legal/terms/students"
        target="_blank"
        rel="noopener noreferrer"
        className={legalLinkClassName}
      >
        {t("acceptCheckoutTermsStudentLink")}
      </Link>{" "}
      {t("acceptCheckoutTermsJoiner")}{" "}
      <Link
        href="/legal/refund/students"
        target="_blank"
        rel="noopener noreferrer"
        className={legalLinkClassName}
      >
        {t("acceptCheckoutTermsRefundLink")}
      </Link>
      {t("acceptCheckoutTermsSuffix")}
    </span>
  );
}
