import { expect, test } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildInvoicePdf } from "../invoice-pdf";

// Real fonts and real PDF output: mocked draw calls cannot detect WinAnsi errors.
test.each([false, true])("an English document renders Japanese participant names (refunded=%s)", async (refunded) => {
  const bytes = await buildInvoicePdf({
    invoiceNo: "INV-UNICODE-001", amountYen: 3300, paidAt: "November 5, 2026",
    studentName: "田中 ゆき", teacherName: "佐藤 美香", className: "Japanese conversation",
    durationMin: 60, lessonDate: "November 8, 2026", language: "en", learningLanguage: "JAPANESE",
    ...(refunded ? { creditNote: { creditNoteNo: "CRN-UNICODE-001", refundedAt: "November 6, 2026" } } : {}),
  });
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
});
