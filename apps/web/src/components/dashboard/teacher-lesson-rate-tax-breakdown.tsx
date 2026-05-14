"use client";

import { useTranslations } from "next-intl";
import {
  calculateTaxIncludedInvoiceTotals,
  calculateTotalsFromExclusiveSubtotal,
} from "@/lib/invoice-totals";
import type { TeacherLessonRatePriceBasis } from "@/lib/teacher-lesson-rate-basis";

type Props = {
  basis: TeacherLessonRatePriceBasis;
  rateYenInput: string;
};

export function TeacherLessonRateTaxBreakdown({ basis, rateYenInput }: Props) {
  const t = useTranslations("dashboard.profilePage");
  const n = Number.parseInt(rateYenInput.trim(), 10);
  if (Number.isNaN(n) || n <= 0) return null;

  if (basis === "tax_included") {
    const { subtotalYen, taxYen } = calculateTaxIncludedInvoiceTotals(n);
    return (
      <p className="m-0 text-xs leading-snug text-muted">
        {t("teacherRateBreakdownTaxIncluded", { tax: taxYen, subtotal: subtotalYen })}
      </p>
    );
  }

  const { taxYen, totalYen } = calculateTotalsFromExclusiveSubtotal(n);
  return (
    <p className="m-0 text-xs leading-snug text-muted">
      {t("teacherRateBreakdownTaxExclusive", { tax: taxYen, total: totalYen })}
    </p>
  );
}
