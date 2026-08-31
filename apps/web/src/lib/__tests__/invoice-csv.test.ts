import { describe, expect, test } from "vitest";
import { buildInvoiceCsv } from "@/lib/invoice-csv";

describe("buildInvoiceCsv", () => {
  test("renders invoice csv with header and row", () => {
    const csv = buildInvoiceCsv({
      invoiceNo: "INV-1",
      studentName: "Yuki Tanaka",
      className: "Beginner Conversation",
      durationMin: 30,
      priceYen: 3300,
      subtotalYen: 3000,
      taxYen: 300,
      totalYen: 3300,
      paidAtIso: "2026-04-10T12:00:00.000Z",
      bookingId: "b1",
      studentEmail: "student@example.com",
      teacherName: "Teacher A",
      paymentMethod: "CARD",
    });

    expect(csv).toContain(
      "invoiceNo,studentName,className,durationMin,priceYen,subtotalYen,taxYen,totalYen,paidAt,bookingId,studentEmail,teacherName,paymentMethod",
    );
    expect(csv).toContain(
      "INV-1,Yuki Tanaka,Beginner Conversation,30,3300,3000,300,3300,2026-04-10T12:00:00.000Z,b1,student@example.com,Teacher A,Credit card",
    );
  });

  test("leaves the payment method blank when the booking has no payment", () => {
    const csv = buildInvoiceCsv({
      invoiceNo: "INV-1",
      studentName: "Yuki Tanaka",
      className: "Beginner Conversation",
      durationMin: 30,
      priceYen: 3300,
      subtotalYen: 3000,
      taxYen: 300,
      totalYen: 3300,
      paidAtIso: "2026-04-10T12:00:00.000Z",
      bookingId: "b1",
      studentEmail: "student@example.com",
      teacherName: "Teacher A",
      paymentMethod: null,
    });

    expect(csv.trimEnd().endsWith("Teacher A,,,,,,,")).toBe(true);
  });

  test("carries the refund beside the sale, with negative amounts", () => {
    const csv = buildInvoiceCsv({
      invoiceNo: "INV-1",
      studentName: "Yuki Tanaka",
      className: "Beginner Conversation",
      durationMin: 30,
      priceYen: 3300,
      subtotalYen: 3000,
      taxYen: 300,
      totalYen: 3300,
      paidAtIso: "2026-04-10T12:00:00.000Z",
      bookingId: "b1",
      studentEmail: "student@example.com",
      teacherName: "Teacher A",
      paymentMethod: "CARD",
      refund: {
        creditNoteNo: "CRN-1",
        amountYen: 3300,
        refundedAtIso: "2026-04-12T02:00:00.000Z",
        status: "SUCCEEDED",
      },
    });

    expect(csv).toContain(
      "teacherName,paymentMethod,creditNoteNo,refundedAt,refundStatus," +
        "refundSubtotalYen,refundTaxYen,refundTotalYen",
    );
    expect(csv).toContain(
      "Credit card,CRN-1,2026-04-12T02:00:00.000Z,SUCCEEDED,-3000,-300,-3300",
    );
  });

  test("leaves the refund columns empty for a lesson that stands", () => {
    const csv = buildInvoiceCsv({
      invoiceNo: "INV-1",
      studentName: "Yuki Tanaka",
      className: "Beginner Conversation",
      durationMin: 30,
      priceYen: 3300,
      subtotalYen: 3000,
      taxYen: 300,
      totalYen: 3300,
      paidAtIso: "2026-04-10T12:00:00.000Z",
      bookingId: "b1",
      studentEmail: "student@example.com",
      teacherName: "Teacher A",
      paymentMethod: "CARD",
    });

    expect(csv.trimEnd().endsWith("Credit card,,,,,,")).toBe(true);
  });
});
