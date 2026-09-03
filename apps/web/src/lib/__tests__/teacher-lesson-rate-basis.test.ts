import { describe, expect, test } from "vitest";
import {
  convertTeacherRateInputBetweenBases,
  ratePriceBasisFromStored,
  storedRatePriceBasis,
  taxIncludedRateFromTeacherInput,
} from "@/lib/teacher-lesson-rate-basis";

describe("taxIncludedRateFromTeacherInput", () => {
  test("passes through tax-included amount", () => {
    expect(taxIncludedRateFromTeacherInput(3300, "tax_included")).toBe(3300);
  });

  test("computes tax-included total from exclusive subtotal", () => {
    expect(taxIncludedRateFromTeacherInput(3000, "tax_exclusive")).toBe(3300);
  });
});

describe("convertTeacherRateInputBetweenBases", () => {
  test("round-trips included → exclusive → included", () => {
    const ex = convertTeacherRateInputBetweenBases(3500, "tax_included", "tax_exclusive");
    expect(ex).toBe(3182);
    expect(convertTeacherRateInputBetweenBases(ex, "tax_exclusive", "tax_included")).toBe(3500);
  });
});

describe("storedRatePriceBasis / ratePriceBasisFromStored", () => {
  test("maps the form's value to the column's", () => {
    expect(storedRatePriceBasis("tax_included")).toBe("TAX_INCLUDED");
    expect(storedRatePriceBasis("tax_exclusive")).toBe("TAX_EXCLUSIVE");
  });

  test("maps the column's value back to the form's", () => {
    expect(ratePriceBasisFromStored("TAX_INCLUDED")).toBe("tax_included");
    expect(ratePriceBasisFromStored("TAX_EXCLUSIVE")).toBe("tax_exclusive");
  });

  // Rows written before the column existed carry the default, and a teacher
  // who never touched the control should see the list price.
  test("treats an absent basis as the list price", () => {
    expect(ratePriceBasisFromStored(null)).toBe("tax_included");
    expect(ratePriceBasisFromStored(undefined)).toBe("tax_included");
  });

  test("survives a round trip either way", () => {
    for (const basis of ["tax_included", "tax_exclusive"] as const) {
      expect(ratePriceBasisFromStored(storedRatePriceBasis(basis))).toBe(basis);
    }
  });
});
