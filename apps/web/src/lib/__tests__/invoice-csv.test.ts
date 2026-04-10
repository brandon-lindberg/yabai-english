import { describe, expect, test } from "vitest";
import { buildInvoiceCsv } from "@/lib/invoice-csv";

describe("buildInvoiceCsv", () => {
  test("renders invoice csv with header and row", () => {
    const csv = buildInvoiceCsv({
      invoiceNo: "INV-1",
      amountYen: 3000,
      paidAtIso: "2026-04-10T12:00:00.000Z",
      bookingId: "b1",
      studentEmail: "student@example.com",
      teacherName: "Teacher A",
    });

    expect(csv).toContain("invoiceNo,amountYen,paidAt,bookingId,studentEmail,teacherName");
    expect(csv).toContain("INV-1,3000,2026-04-10T12:00:00.000Z,b1,student@example.com,Teacher A");
  });
});
