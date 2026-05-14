import { describe, expect, test } from "vitest";
import {
  convertTeacherRateInputBetweenBases,
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
