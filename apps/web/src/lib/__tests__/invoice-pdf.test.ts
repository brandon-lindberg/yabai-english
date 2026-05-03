import { beforeEach, describe, expect, test, vi } from "vitest";

const { drawnTexts, drawnTextCalls } = vi.hoisted(() => ({
  drawnTexts: [] as string[],
  drawnTextCalls: [] as Array<{
    text: string;
    x: number;
    size: number;
    width: number;
  }>,
}));

vi.mock("pdf-lib", () => ({
  PDFDocument: {
    create: vi.fn(async () => ({
      registerFontkit: vi.fn(),
      addPage: vi.fn(() => ({
        getSize: () => ({ width: 595, height: 842 }),
        drawText: vi.fn(
          (
            text: string,
            options: {
              x: number;
              size: number;
              font: { widthOfTextAtSize: (value: string, size: number) => number };
            },
          ) => {
          drawnTexts.push(text);
            drawnTextCalls.push({
              text,
              x: options.x,
              size: options.size,
              width: options.font.widthOfTextAtSize(text, options.size),
            });
          },
        ),
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
    drawnTextCalls.length = 0;
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
      language: "en",
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

  test("keeps the price column header inside the table edge", async () => {
    await buildInvoicePdf({
      invoiceNo: "INV-2025-05-24-001",
      amountYen: 3300,
      paidAt: "May 24, 2025",
      studentName: "Yuki Tanaka",
      className: "Beginner Conversation",
      durationMin: 30,
      lessonDate: "May 24, 2025",
      language: "en",
    });

    const priceHeader = drawnTextCalls.find((call) => call.text === "Price (JPY)");

    expect(priceHeader).toBeDefined();
    expect(priceHeader!.x + priceHeader!.width).toBeLessThanOrEqual(545);
  });

  test("renders Japanese invoice labels when requested", async () => {
    await buildInvoicePdf({
      invoiceNo: "INV-2025-05-24-001",
      amountYen: 3300,
      paidAt: "2025年5月24日",
      studentName: "田中 ゆき",
      className: "初級英会話",
      durationMin: 30,
      lessonDate: "2025年5月24日",
      language: "ja",
    });

    expect(drawnTexts).toEqual(
      expect.arrayContaining([
        "請求書",
        "請求日:",
        "田中 ゆき",
        "English Studio Japanをご利用いただきありがとうございます。",
        "項目",
        "クラス",
        "時間",
        "金額 (JPY)",
        "初級英会話",
        "30分",
        "税抜金額",
        "消費税 (10%)",
        "合計金額",
        "金額はすべて日本円 (JPY) です。",
      ]),
    );
  });
});
