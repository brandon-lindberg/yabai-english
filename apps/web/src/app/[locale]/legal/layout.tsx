import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { actionLinkClass } from "@/components/ui/inline-link";

export default async function LegalLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("legal");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6">
      <nav
        aria-label={t("navAria")}
        className="mb-8 flex flex-wrap gap-x-4 gap-y-2 border-b border-border pb-4 text-sm"
      >
        <Link
          href="/legal/terms"
          className={actionLinkClass}
        >
          {t("navTerms")}
        </Link>
        <Link
          href="/legal/terms/teachers"
          className={actionLinkClass}
        >
          {t("navTermsTeachers")}
        </Link>
        <Link
          href="/legal/terms/students"
          className={actionLinkClass}
        >
          {t("navTermsStudents")}
        </Link>
        <Link
          href="/legal/refund/teachers"
          className={actionLinkClass}
        >
          {t("navRefundTeachers")}
        </Link>
        <Link
          href="/legal/refund/students"
          className={actionLinkClass}
        >
          {t("navRefundStudents")}
        </Link>
        <Link
          href="/legal/privacy"
          className={actionLinkClass}
        >
          {t("navPrivacy")}
        </Link>
      </nav>
      {children}
    </div>
  );
}
