import { describe, expect, test } from "vitest";
import {
  buildTeacherInvoiceCsvRow,
  buildTeacherInvoicesCsv,
  escapeCsvCell,
  formatTokyoDate,
} from "@/lib/teacher-invoice-csv";

describe("escapeCsvCell", () => {
  test("wraps values that contain commas", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
  });

  test("escapes embedded double quotes", () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });
});

describe("formatTokyoDate", () => {
  test("maps UTC instant to Tokyo calendar date", () => {
    const d = new Date("2026-05-10T15:00:00.000Z");
    expect(formatTokyoDate(d)).toBe("2026-05-11");
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
      paidAt: new Date("2026-04-28T02:00:00.000Z"),
      amountYenTaxIncluded: 3300,
      paymentMethod: "CARD",
    });
    expect(line).toContain("INV-1");
    expect(line).toContain("Teacher T");
    expect(line).toContain("Student S");
    expect(line).toContain("初級 / Beginner");
    expect(line).toContain(",30,");
    expect(line).toContain("2026-05-11");
    // Paid a fortnight before the lesson: the two dates are independent.
    expect(line).toContain("2026-04-28");
    expect(line.endsWith(",3000,300,3300,Credit card,,,,,,")).toBe(true);
  });

  test("leaves the payment method blank when the booking has no payment", () => {
    const line = buildTeacherInvoiceCsvRow({
      invoiceNo: "INV-1",
      teacherDisplay: "Teacher T",
      studentDisplay: "Student S",
      lessonTypeJaEn: "初級 / Beginner",
      lessonLengthMinutes: 30,
      lessonStartsAt: new Date("2026-05-10T15:00:00.000Z"),
      paidAt: new Date("2026-04-28T02:00:00.000Z"),
      amountYenTaxIncluded: 3300,
      paymentMethod: null,
    });
    expect(line.endsWith(",3000,300,3300,,,,,,,")).toBe(true);
  });
});

describe("buildTeacherInvoicesCsv", () => {
  test("includes a header row", () => {
    const csv = buildTeacherInvoicesCsv([]);
    expect(csv.startsWith("Invoice number,Teacher name,Student name,")).toBe(true);
    expect(csv).toContain("Amount after tax (JPY),Payment method,Credit note number");
    // The payment date sits beside the lesson date so the two read together.
    expect(csv).toContain(
      "Lesson date (Asia/Tokyo),Payment date (Asia/Tokyo),Amount before tax (JPY)",
    );
  });
});

describe("refunded lessons in the export", () => {
  const base = {
    invoiceNo: "INV-1",
    teacherDisplay: "Teacher T",
    studentDisplay: "Student S",
    lessonTypeJaEn: "初級 / Beginner",
    lessonLengthMinutes: 30,
    lessonStartsAt: new Date("2026-05-10T15:00:00.000Z"),
    paidAt: new Date("2026-04-28T02:00:00.000Z"),
    amountYenTaxIncluded: 3300,
    paymentMethod: "CARD" as const,
  };

  test("carries the refund alongside the sale so the row nets out", () => {
    const line = buildTeacherInvoiceCsvRow({
      ...base,
      refund: {
        creditNoteNo: "CRN-1",
        amountYen: 3300,
        refundedAt: new Date("2026-05-02T01:00:00.000Z"),
        status: "SUCCEEDED",
      },
    });

    // Refunded amounts are negative: a reader summing the column gets the net.
    expect(line.endsWith(",CRN-1,2026-05-02,SUCCEEDED,-3000,-300,-3300")).toBe(true);
  });

  test("a lesson that was never refunded leaves those columns empty", () => {
    const line = buildTeacherInvoiceCsvRow(base);
    expect(line.endsWith(",Credit card,,,,,,")).toBe(true);
  });

  test("the header names every refund column", () => {
    const csv = buildTeacherInvoicesCsv([]);
    expect(csv.trimEnd().endsWith(
      "Credit note number,Refund date (Asia/Tokyo),Refund status," +
        "Refunded before tax (JPY),Refunded tax (JPY),Refunded total (JPY)",
    )).toBe(true);
  });

  test("a refund still in flight is reported with its status, not as settled", () => {
    const line = buildTeacherInvoiceCsvRow({
      ...base,
      refund: {
        creditNoteNo: null,
        amountYen: 3300,
        refundedAt: new Date("2026-05-02T01:00:00.000Z"),
        status: "PENDING",
      },
    });
    expect(line).toContain(",,2026-05-02,PENDING,");
  });
});
