import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock, buildInvoicePdfMock, ensureCreditNoteNumberMock, ensureInvoiceMock } = vi.hoisted(() => ({
  ensureCreditNoteNumberMock: vi.fn(),
  ensureInvoiceMock: vi.fn(),
  authMock: vi.fn(),
  prismaMock: {
    refund: { findUnique: vi.fn() },
    payment: { findUnique: vi.fn() },
  },
  buildInvoicePdfMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/credit-notes", () => ({
  ensureCreditNoteNumber: ensureCreditNoteNumberMock,
}));
vi.mock("@/lib/ensure-invoice", () => ({ ensureInvoiceForPaidBooking: ensureInvoiceMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/invoice-pdf", () => ({ buildInvoicePdf: buildInvoicePdfMock }));

import { GET } from "@/app/api/refunds/[refundId]/credit-note/route";

const params = { params: Promise.resolve({ refundId: "refund-1" }) };
const request = (lang = "en") =>
  new Request(`http://localhost/api/refunds/refund-1/credit-note?lang=${lang}`);

describe("GET /api/refunds/[refundId]/credit-note", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "student-1" } });
    buildInvoicePdfMock.mockResolvedValue(new Uint8Array([1, 2, 3]));
    prismaMock.payment.findUnique.mockResolvedValue({ method: "CARD" });
    ensureCreditNoteNumberMock.mockResolvedValue("CRN-1");
    ensureInvoiceMock.mockResolvedValue({ id: "inv-1", invoiceNo: "INV-1", paidAt: new Date() });
    prismaMock.refund.findUnique.mockResolvedValue({
      id: "refund-1",
      amountYen: 3300,
      status: "SUCCEEDED",
      creditNoteNo: "CRN-1",
      createdAt: new Date("2026-09-01T02:00:00Z"),
      booking: {
        id: "booking-1",
        studentId: "student-1",
        startsAt: new Date("2026-08-30T01:00:00Z"),
        student: { name: "Kana", email: "kana@example.com" },
        teacher: { userId: "teacher-user-1", displayName: "Mika S.", user: { name: "Mika Sato", email: "m@e.com" } },
        lessonProduct: { nameEn: "Conversation", nameJa: "英会話", durationMin: 40 },
        invoice: { invoiceNo: "INV-1", paidAt: new Date("2026-07-26T02:00:00Z") },
      },
    });
  });

  test("names the file after the document, not after null", async () => {
    /*
      The number is minted on demand for a refund that never had one, and the
      filename was still reading the stale field beside it — so the download
      arrived as `null-en.pdf`, which is both meaningless to the student and
      useless in a folder of records.
    */
    prismaMock.refund.findUnique.mockResolvedValue({
      id: "refund-1",
      amountYen: 3300,
      status: "SUCCEEDED",
      creditNoteNo: null,
      createdAt: new Date("2026-09-01T02:00:00Z"),
      booking: {
        id: "booking-1",
        studentId: "student-1",
        startsAt: new Date("2026-08-30T01:00:00Z"),
        student: { name: "Kana", email: "kana@example.com" },
        teacher: { userId: "teacher-user-1", displayName: "Mika S.", user: { name: "Mika Sato", email: "m@e.com" } },
        lessonProduct: { nameEn: "Conversation", nameJa: "英会話", durationMin: 40 },
        invoice: { invoiceNo: "INV-1", paidAt: new Date("2026-07-26T02:00:00Z") },
      },
    });
    ensureCreditNoteNumberMock.mockResolvedValue("CRN-MINTED");

    const res = await GET(request(), params);

    expect(res.headers.get("Content-Disposition")).toContain("CRN-MINTED-en.pdf");
    expect(res.headers.get("Content-Disposition")).not.toContain("null");
  });

  test("gives the student the credit note for their own refund", async () => {
    const res = await GET(request(), params);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("CRN-1-en.pdf");
    expect(buildInvoicePdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceNo: "INV-1",
        amountYen: 3300,
        teacherName: "Mika S.",
        paymentMethod: "CARD",
        creditNote: expect.objectContaining({ creditNoteNo: "CRN-1" }),
      }),
    );
  });

  test("gives the owning teacher the same document", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-user-1" } });
    expect((await GET(request(), params)).status).toBe(200);
  });

  test("refuses anyone else", async () => {
    authMock.mockResolvedValue({ user: { id: "someone-else" } });
    expect((await GET(request(), params)).status).toBe(404);
    expect(buildInvoicePdfMock).not.toHaveBeenCalled();
  });

  test("has nothing to serve until the refund has settled", async () => {
    const refund = await prismaMock.refund.findUnique();
    prismaMock.refund.findUnique.mockResolvedValue({
      ...refund,
      status: "PENDING",
      creditNoteNo: null,
    });
    // What the real helper does for a refund that has not settled: a number is
    // only issued once the money has actually gone back.
    ensureCreditNoteNumberMock.mockResolvedValue(null);

    expect((await GET(request(), params)).status).toBe(404);
    expect(buildInvoicePdfMock).not.toHaveBeenCalled();
  });

  test("dates the return and the original transaction separately", async () => {
    await GET(request(), params);

    const arg = buildInvoicePdfMock.mock.calls[0]![0];
    // 返還年月日 is when the money went back; 元取引年月日 is the original sale.
    expect(arg.creditNote.refundedAt).toBe("September 1, 2026");
    expect(arg.paidAt).toBe("July 26, 2026");
  });
});
