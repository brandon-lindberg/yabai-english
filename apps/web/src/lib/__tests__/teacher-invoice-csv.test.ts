import { describe, expect, test } from "vitest";
import {
  buildTeacherInvoiceCsvRow,
  buildTeacherInvoicesCsv,
  escapeCsvCell,
  formatLessonDateTokyo,
} from "@/lib/teacher-invoice-csv";

describe("escapeCsvCell", () => {
  test("wraps values that contain commas", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
  });

  test("escapes embedded double quotes", () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });
});

describe("formatLessonDateTokyo", () => {
  test("maps UTC instant to Tokyo calendar date", () => {
    const d = new Date("2026-05-10T15:00:00.000Z");
    expect(formatLessonDateTokyo(d)).toBe("2026-05-11");
  });
});

describe("buildTeacherInvoiceCsvRow", () => {
  test("includes subtotal tax and total from tax-included amount", () => {
    const line = buildTeacherInvoiceCsvRow({
      invoiceNo: "INV-1",
      teacherDisplay: "Teacher T",
      studentDisplay: "Student S",
      lessonTypeJaEn: "初級 / Beginner",
      lessonLengthMinutes: 30,
      lessonStartsAt: new Date("2026-05-10T15:00:00.000Z"),
      amountYenTaxIncluded: 3300,
    });
    expect(line).toContain("INV-1");
    expect(line).toContain("Teacher T");
    expect(line).toContain("Student S");
    expect(line).toContain("初級 / Beginner");
    expect(line).toContain(",30,");
    expect(line).toContain("2026-05-11");
    expect(line.endsWith(",3000,300,3300")).toBe(true);
  });
});

describe("buildTeacherInvoicesCsv", () => {
  test("includes a header row", () => {
    const csv = buildTeacherInvoicesCsv([]);
    expect(csv.startsWith("Invoice number,Teacher name,Student name,")).toBe(true);
  });
});
