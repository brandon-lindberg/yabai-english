import { DateTime } from "luxon";
import { calculateTaxIncludedInvoiceTotals } from "@/lib/invoice-totals";

export type TeacherInvoiceCsvRowInput = {
  invoiceNo: string;
  teacherDisplay: string;
  studentDisplay: string;
  lessonTypeJaEn: string;
  lessonLengthMinutes: number;
  /** Stored instant; rendered as calendar date in Asia/Tokyo. */
  lessonStartsAt: Date;
  amountYenTaxIncluded: number;
};

export const TEACHER_INVOICE_CSV_HEADERS = [
  "Invoice number",
  "Teacher name",
  "Student name",
  "Lesson type",
  "Lesson length (minutes)",
  "Lesson date (Asia/Tokyo)",
  "Amount before tax (JPY)",
  "Tax charged (JPY)",
  "Amount after tax (JPY)",
] as const;

export function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function formatLessonDateTokyo(startsAt: Date): string {
  return DateTime.fromJSDate(startsAt, { zone: "utc" })
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
    formatLessonDateTokyo(input.lessonStartsAt),
    String(subtotalYen),
    String(taxYen),
    String(totalYen),
  ];
  return cells.map(escapeCsvCell).join(",");
}

export function buildTeacherInvoicesCsv(rows: TeacherInvoiceCsvRowInput[]): string {
  const headerLine = [...TEACHER_INVOICE_CSV_HEADERS].map(escapeCsvCell).join(",");
  const body = rows.map((r) => buildTeacherInvoiceCsvRow(r));
  return [headerLine, ...body].join("\r\n");
}
