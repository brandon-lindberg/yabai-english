import { beforeEach, describe, expect, test, vi } from "vitest";

const { drawnTexts } = vi.hoisted(() => ({
  drawnTexts: [] as string[],
}));

vi.mock("pdf-lib", () => ({
  PDFDocument: {
    create: vi.fn(async () => ({
      addPage: vi.fn(() => ({
        getSize: () => ({ width: 595, height: 842 }),
        drawText: vi.fn((text: string) => {
          drawnTexts.push(text);
        }),
        drawLine: vi.fn(),
        drawRectangle: vi.fn(),
      })),
      embedFont: vi.fn(async () => ({
        widthOfTextAtSize: (text: string, size: number) => text.length * size * 0.5,
      })),
      save: vi.fn(async () => new Uint8Array([1, 2, 3])),
    })),
  },
  StandardFonts: {
    Helvetica: "Helvetica",
    HelveticaBold: "HelveticaBold",
  },
  rgb: vi.fn(() => ({})),
}));

import { buildInvoicePdf } from "@/lib/invoice-pdf";

describe("buildInvoicePdf", () => {
  beforeEach(() => {
    drawnTexts.length = 0;
  });

  test("renders student, class, duration, price, tax, and final total", async () => {
    await buildInvoicePdf({
      invoiceNo: "INV-2025-05-24-001",
      amountYen: 3300,
      paidAt: "May 24, 2025",
      studentName: "Yuki Tanaka",
      className: "Beginner Conversation",
      durationMin: 30,
      lessonDate: "May 24, 2025",
    });

    expect(drawnTexts).toEqual(
      expect.arrayContaining([
        "English Studio Japan",
        "INVOICE",
        "Yuki Tanaka",
        "Beginner Conversation",
        "30 min",
        "¥3,300",
        "Total before tax",
        "¥3,000",
        "Tax (10%)",
        "¥300",
        "Final Total",
      ]),
    );
  });
});
