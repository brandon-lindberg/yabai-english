import {
  calculateTaxIncludedInvoiceTotals,
  calculateTotalsFromExclusiveSubtotal,
} from "@/lib/invoice-totals";

export type TeacherLessonRatePriceBasis = "tax_included" | "tax_exclusive";

/** Stored / API `rateYen` is always tax-included (what students pay). */
export function taxIncludedRateFromTeacherInput(
  enteredYen: number,
  basis: TeacherLessonRatePriceBasis,
): number {
  const n = Math.trunc(enteredYen);
  if (basis === "tax_included") return n;
  return calculateTotalsFromExclusiveSubtotal(n).totalYen;
}

/** When toggling entry mode, rewrite the numeric value shown in the field. */
export function convertTeacherRateInputBetweenBases(
  enteredYen: number,
  from: TeacherLessonRatePriceBasis,
  to: TeacherLessonRatePriceBasis,
): number {
  const n = Math.trunc(enteredYen);
  if (from === to) return n;
  if (from === "tax_included" && to === "tax_exclusive") {
    return calculateTaxIncludedInvoiceTotals(n).subtotalYen;
  }
  return calculateTotalsFromExclusiveSubtotal(n).totalYen;
}
