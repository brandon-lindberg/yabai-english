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

/**
 * The same choice as the `LessonRatePriceBasis` column.
 *
 * The form's value is lowercase because it predates the column; the column is
 * upper-snake because every other enum in the schema is. Rather than rename one
 * to match the other across five files, the translation lives here, next to the
 * type it belongs to.
 */
export type StoredRatePriceBasis = "TAX_INCLUDED" | "TAX_EXCLUSIVE";

export function storedRatePriceBasis(
  basis: TeacherLessonRatePriceBasis,
): StoredRatePriceBasis {
  return basis === "tax_exclusive" ? "TAX_EXCLUSIVE" : "TAX_INCLUDED";
}

/**
 * Rows written before the column existed, and teachers who never touched the
 * control, both mean the list price — so anything unset reads as tax-included.
 */
export function ratePriceBasisFromStored(
  stored: StoredRatePriceBasis | string | null | undefined,
): TeacherLessonRatePriceBasis {
  return stored === "TAX_EXCLUSIVE" ? "tax_exclusive" : "tax_included";
}
