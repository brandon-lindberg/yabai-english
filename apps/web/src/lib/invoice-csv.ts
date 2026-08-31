import type { TeacherPaymentMethodType } from "@/generated/prisma/client";
import type { RefundStatus } from "@/generated/prisma/enums";
import { calculateTaxIncludedInvoiceTotals } from "@/lib/invoice-totals";
import { paymentMethodLabel } from "@/lib/payment-method-label";

export function buildInvoiceCsv(input: {
  invoiceNo: string;
  studentName: string;
  className: string;
  durationMin: number;
  priceYen: number;
  subtotalYen: number;
  taxYen: number;
  totalYen: number;
  paidAtIso: string;
  bookingId: string;
  studentEmail: string;
  teacherName: string;
  /** Null when the booking has no recorded payment. */
  paymentMethod?: TeacherPaymentMethodType | null;
  /**
   * The return of consideration, when there was one. Beside the sale rather
   * than replacing it: the invoice was issued and the refund is a second event.
   */
  refund?: {
    creditNoteNo: string | null;
    amountYen: number;
    refundedAtIso: string;
    status: RefundStatus;
  } | null;
}) {
  const header =
    "invoiceNo,studentName,className,durationMin,priceYen,subtotalYen,taxYen,totalYen,paidAt,bookingId,studentEmail,teacherName,paymentMethod," +
    "creditNoteNo,refundedAt,refundStatus,refundSubtotalYen,refundTaxYen,refundTotalYen";
  const row = [
    input.invoiceNo,
    input.studentName,
    input.className,
    String(input.durationMin),
    String(input.priceYen),
    String(input.subtotalYen),
    String(input.taxYen),
    String(input.totalYen),
    input.paidAtIso,
    input.bookingId,
    input.studentEmail,
    input.teacherName,
    paymentMethodLabel(input.paymentMethod),
    ...refundCells(input.refund),
  ]
    .map(csvCell)
    .join(",");
  return `${header}\n${row}\n`;
}

/** Six cells, blank when nothing was returned; refunded amounts are negative. */
function refundCells(refund: Parameters<typeof buildInvoiceCsv>[0]["refund"]): string[] {
  if (!refund) return ["", "", "", "", "", ""];
  const { subtotalYen, taxYen, totalYen } = calculateTaxIncludedInvoiceTotals(refund.amountYen);
  return [
    refund.creditNoteNo ?? "",
    refund.refundedAtIso,
    refund.status,
    String(-subtotalYen),
    String(-taxYen),
    String(-totalYen),
  ];
}

function csvCell(value: string) {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}
