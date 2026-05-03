import { describe, expect, test } from "vitest";
import { calculateTaxIncludedInvoiceTotals } from "@/lib/invoice-totals";

describe("calculateTaxIncludedInvoiceTotals", () => {
  test("derives subtotal and 10% tax from a tax-included total", () => {
    expect(calculateTaxIncludedInvoiceTotals(3300)).toEqual({
      subtotalYen: 3000,
      taxYen: 300,
      totalYen: 3300,
    });
  });

  test("rounds tax down to whole yen", () => {
    expect(calculateTaxIncludedInvoiceTotals(3500)).toEqual({
      subtotalYen: 3182,
      taxYen: 318,
      totalYen: 3500,
    });
  });
});
