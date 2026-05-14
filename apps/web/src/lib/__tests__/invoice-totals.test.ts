import { describe, expect, test } from "vitest";
import {
  calculateTaxIncludedInvoiceTotals,
  calculateTotalsFromExclusiveSubtotal,
} from "@/lib/invoice-totals";

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

describe("calculateTotalsFromExclusiveSubtotal", () => {
  test("adds 10% tax (floored) to exclusive subtotal for student total", () => {
    expect(calculateTotalsFromExclusiveSubtotal(3000)).toEqual({
      subtotalYen: 3000,
      taxYen: 300,
      totalYen: 3300,
    });
  });

  test("matches reverse of tax-included breakdown for awkward totals", () => {
    const { subtotalYen, taxYen, totalYen } = calculateTaxIncludedInvoiceTotals(3500);
    expect(calculateTotalsFromExclusiveSubtotal(subtotalYen)).toEqual({
      subtotalYen,
      taxYen,
      totalYen,
    });
  });
});
