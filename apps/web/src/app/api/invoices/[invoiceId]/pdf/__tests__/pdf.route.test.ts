import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock, buildInvoicePdfMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    invoice: { findUnique: vi.fn() },
  },
  buildInvoicePdfMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/invoice-pdf", () => ({ buildInvoicePdf: buildInvoicePdfMock }));

import { GET } from "@/app/api/invoices/[invoiceId]/pdf/route";

describe("GET /api/invoices/[invoiceId]/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "student-1" } });
    buildInvoicePdfMock.mockResolvedValue(new Uint8Array([1, 2, 3]));
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: "invoice-1",
      bookingId: "booking-1",
      studentId: "student-1",
      amountYen: 3300,
      invoiceNo: "INV-1",
      paidAt: new Date("2026-05-03T00:00:00Z"),
      student: {
        id: "student-1",
        name: "田中 ゆき",
        email: "student@example.com",
      },
      booking: {
        startsAt: new Date("2026-05-10T00:00:00Z"),
        teacher: {
          displayName: "Teacher A",
          user: { name: "Teacher User", email: "teacher@example.com" },
        },
        lessonProduct: {
          nameEn: "Beginner Conversation",
          nameJa: "初級英会話",
          durationMin: 30,
        },
      },
    });
  });

  test("passes Japanese invoice data to the PDF builder when lang=ja", async () => {
    const res = await GET(
      new Request("http://localhost/api/invoices/invoice-1/pdf?lang=ja"),
      { params: Promise.resolve({ invoiceId: "invoice-1" }) },
    );

    expect(res.status).toBe(200);
    expect(buildInvoicePdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        studentName: "田中 ゆき",
        className: "初級英会話",
        language: "ja",
      }),
    );
    expect(res.headers.get("Content-Disposition")).toContain("INV-1-ja.pdf");
  });
});
