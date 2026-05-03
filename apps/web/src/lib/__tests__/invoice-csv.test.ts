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
    });

    expect(csv).toContain(
      "invoiceNo,studentName,className,durationMin,priceYen,subtotalYen,taxYen,totalYen,paidAt,bookingId,studentEmail,teacherName",
    );
    expect(csv).toContain(
      "INV-1,Yuki Tanaka,Beginner Conversation,30,3300,3000,300,3300,2026-04-10T12:00:00.000Z,b1,student@example.com,Teacher A",
    );
  });
});
