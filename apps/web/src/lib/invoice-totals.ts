export const INVOICE_TAX_RATE_PERCENT = 10;

export function calculateTaxIncludedInvoiceTotals(totalYen: number) {
  const normalizedTotalYen = Math.trunc(totalYen);
  const taxYen = Math.floor(
    (normalizedTotalYen * INVOICE_TAX_RATE_PERCENT) /
      (100 + INVOICE_TAX_RATE_PERCENT),
  );

  return {
    subtotalYen: normalizedTotalYen - taxYen,
    taxYen,
    totalYen: normalizedTotalYen,
  };
}

/** Tax-exclusive subtotal → 10% tax (floored) + tax-included total (student-facing list price). */
export function calculateTotalsFromExclusiveSubtotal(subtotalYen: number) {
  const subtotal = Math.trunc(subtotalYen);
  const taxYen = Math.floor((subtotal * INVOICE_TAX_RATE_PERCENT) / 100);
  return {
    subtotalYen: subtotal,
    taxYen,
    totalYen: subtotal + taxYen,
  };
}
