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
