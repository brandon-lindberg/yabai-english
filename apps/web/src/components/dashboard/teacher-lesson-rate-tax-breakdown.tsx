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

/**
 * What the student is charged, and how it splits.
 *
 * One sentence for both entry modes, and it always leads with the total. The
 * two modes used to have their own wording that listed the parts without
 * naming the whole — "Consumption tax portion: ¥363 · Your fee before tax:
 * ¥3,637" under a field reading 4000 — which left the smaller of the two
 * figures looking like the price a student pays.
 */
export function TeacherLessonRateTaxBreakdown({ basis, rateYenInput }: Props) {
  const t = useTranslations("dashboard.profilePage");
  const n = Number.parseInt(rateYenInput.trim(), 10);
  if (Number.isNaN(n) || n <= 0) return null;

  const { subtotalYen, taxYen, totalYen } =
    basis === "tax_included"
      ? calculateTaxIncludedInvoiceTotals(n)
      : calculateTotalsFromExclusiveSubtotal(n);

  return (
    <p className="text-xs leading-snug text-muted">
      {t("teacherRateBreakdown", {
        total: totalYen.toLocaleString(),
        subtotal: subtotalYen.toLocaleString(),
        tax: taxYen.toLocaleString(),
      })}
    </p>
  );
}
