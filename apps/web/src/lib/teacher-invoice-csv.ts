import { DateTime } from "luxon";
import type { TeacherPaymentMethodType } from "@/generated/prisma/client";
import { calculateTaxIncludedInvoiceTotals } from "@/lib/invoice-totals";
import { paymentMethodLabel } from "@/lib/payment-method-label";

export type TeacherInvoiceCsvRowInput = {
  invoiceNo: string;
  teacherDisplay: string;
  studentDisplay: string;
  lessonTypeJaEn: string;
  lessonLengthMinutes: number;
  /** Stored instant; rendered as calendar date in Asia/Tokyo. */
  lessonStartsAt: Date;
  /** When the invoice was paid. Reconciliation happens on this date, not the
   *  lesson date, and the two can fall in different months. */
  paidAt: Date;
  amountYenTaxIncluded: number;
  /** Null when the booking has no recorded payment. */
  paymentMethod?: TeacherPaymentMethodType | null;
};

export const TEACHER_INVOICE_CSV_HEADERS = [
  "Invoice number",
  "Teacher name",
  "Student name",
  "Lesson type",
  "Lesson length (minutes)",
  "Lesson date (Asia/Tokyo)",
  "Payment date (Asia/Tokyo)",
  "Amount before tax (JPY)",
  "Tax charged (JPY)",
  "Amount after tax (JPY)",
  "Payment method",
] as const;

export function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Renders a stored instant as the calendar date it fell on in Asia/Tokyo. */
export function formatTokyoDate(instant: Date): string {
  return DateTime.fromJSDate(instant, { zone: "utc" })
    .setZone("Asia/Tokyo")
    .toISODate()!;
}

export function buildTeacherInvoiceCsvRow(input: TeacherInvoiceCsvRowInput): string {
  const { subtotalYen, taxYen, totalYen } = calculateTaxIncludedInvoiceTotals(
    input.amountYenTaxIncluded,
  );
  const cells = [
    input.invoiceNo,
    input.teacherDisplay,
    input.studentDisplay,
    input.lessonTypeJaEn,
    String(input.lessonLengthMinutes),
    formatTokyoDate(input.lessonStartsAt),
    formatTokyoDate(input.paidAt),
    String(subtotalYen),
    String(taxYen),
    String(totalYen),
    paymentMethodLabel(input.paymentMethod),
  ];
  return cells.map(escapeCsvCell).join(",");
}

export function buildTeacherInvoicesCsv(rows: TeacherInvoiceCsvRowInput[]): string {
  const headerLine = [...TEACHER_INVOICE_CSV_HEADERS].map(escapeCsvCell).join(",");
  const body = rows.map((r) => buildTeacherInvoiceCsvRow(r));
  return [headerLine, ...body].join("\r\n");
}
