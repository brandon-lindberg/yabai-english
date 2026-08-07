"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { inlineLinkClass } from "@/components/ui/inline-link";

export function CheckoutTermsAgreementLabel() {
  const t = useTranslations("booking");

  return (
    <span className="leading-relaxed">
      {t("acceptCheckoutTermsPrefix")}{" "}
      <Link
        href="/legal/terms/students"
        target="_blank"
        rel="noopener noreferrer"
        className={inlineLinkClass}
      >
        {t("acceptCheckoutTermsStudentLink")}
      </Link>{" "}
      {t("acceptCheckoutTermsJoiner")}{" "}
      <Link
        href="/legal/refund/students"
        target="_blank"
        rel="noopener noreferrer"
        className={inlineLinkClass}
      >
        {t("acceptCheckoutTermsRefundLink")}
      </Link>
      {t("acceptCheckoutTermsSuffix")}
    </span>
  );
}
