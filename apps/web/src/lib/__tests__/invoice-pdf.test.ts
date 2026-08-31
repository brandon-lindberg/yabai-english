import { beforeEach, describe, expect, test, vi } from "vitest";

const { drawnTexts, drawnTextCalls } = vi.hoisted(() => ({
  drawnTexts: [] as string[],
  drawnTextCalls: [] as Array<{
    text: string;
    x: number;
    size: number;
    width: number;
    fontName: string;
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
              font: {
                fontName?: string;
                widthOfTextAtSize: (value: string, size: number) => number;
              };
            },
          ) => {
            drawnTexts.push(text);
            drawnTextCalls.push({
              text,
              x: options.x,
              size: options.size,
              width: options.font.widthOfTextAtSize(text, options.size),
              fontName: options.font.fontName ?? "unknown",
            });
          },
        ),
        drawLine: vi.fn(),
        drawRectangle: vi.fn(),
      })),
      embedFont: vi.fn(async (fontSource: string | Uint8Array) => {
        const fontName =
          fontSource === "Helvetica"
            ? "Helvetica"
            : fontSource === "HelveticaBold"
              ? "HelveticaBold"
              : "Japanese";
        const widthFactor = fontName.startsWith("Helvetica") ? 0.5 : 1.2;
        return {
          fontName,
          widthOfTextAtSize: (text: string, size: number) =>
            text.length * size * widthFactor,
        };
      }),
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
      teacherName: "Mika Sato",
      paymentMethod: "CARD",
    });

    expect(drawnTexts).toEqual(
      expect.arrayContaining([
        "Mika Sato",
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
      teacherName: "Mika Sato",
      paymentMethod: "CARD",
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
      teacherName: "佐藤 美香",
      paymentMethod: "CARD",
    });

    expect(drawnTexts).toEqual(
      expect.arrayContaining([
        "請求書",
        "請求日:",
        "田中 ゆき",
        "佐藤 美香のレッスンをご利用いただきありがとうございます。",
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

  test("keeps long Japanese invoice numbers inside the page using a Latin font", async () => {
    const invoiceNo = "INV-20260621-235959-ABCDEFGH";

    await buildInvoicePdf({
      invoiceNo,
      amountYen: 3300,
      paidAt: "2026年6月21日",
      studentName: "田中 ゆき",
      className: "初級英会話",
      durationMin: 30,
      lessonDate: "2026年6月21日",
      language: "ja",
      teacherName: "佐藤 美香",
      paymentMethod: "CARD",
    });

    const invoiceNoCall = drawnTextCalls.find((call) => call.text === invoiceNo);

    expect(invoiceNoCall).toBeDefined();
    expect(invoiceNoCall!.fontName).toBe("Helvetica");
    expect(invoiceNoCall!.x + invoiceNoCall!.width).toBeLessThanOrEqual(545);
  });

  test("issues the invoice in the teacher's name, not the platform's", async () => {
    await buildInvoicePdf({
      invoiceNo: "INV-2025-05-24-001",
      amountYen: 3300,
      paidAt: "May 24, 2025",
      studentName: "Yuki Tanaka",
      className: "Beginner Conversation",
      durationMin: 30,
      lessonDate: "May 24, 2025",
      language: "en",
      teacherName: "Mika Sato",
      paymentMethod: "CARD",
    });

    // Teachers invoice their own students independently, so the platform must
    // not appear as the issuer anywhere on the document.
    expect(drawnTexts).toContain("Mika Sato");
    expect(drawnTexts.join(" ")).not.toContain("English Studio Japan");
    expect(drawnTexts).toContain("Thank you for learning with Mika Sato!");
  });

  test("labels the transaction type", async () => {
    await buildInvoicePdf({
      invoiceNo: "INV-2025-05-24-001",
      amountYen: 3300,
      paidAt: "May 24, 2025",
      studentName: "Yuki Tanaka",
      className: "Beginner Conversation",
      durationMin: 30,
      lessonDate: "May 24, 2025",
      language: "en",
      teacherName: "Mika Sato",
      paymentMethod: "CARD",
    });

    expect(drawnTexts).toContain("Payment Method:");
    expect(drawnTexts).toContain("Credit card");
  });

  test("labels a PayPay transaction", async () => {
    await buildInvoicePdf({
      invoiceNo: "INV-2025-05-24-001",
      amountYen: 3300,
      paidAt: "May 24, 2025",
      studentName: "Yuki Tanaka",
      className: "Beginner Conversation",
      durationMin: 30,
      lessonDate: "May 24, 2025",
      language: "en",
      teacherName: "Mika Sato",
      paymentMethod: "PAYPAY",
    });

    expect(drawnTexts).toContain("PayPay");
  });

  test("localizes the transaction type", async () => {
    await buildInvoicePdf({
      invoiceNo: "INV-2025-05-24-001",
      amountYen: 3300,
      paidAt: "2025年5月24日",
      studentName: "田中 ゆき",
      className: "初級英会話",
      durationMin: 30,
      lessonDate: "2025年5月24日",
      language: "ja",
      teacherName: "佐藤 美香",
      paymentMethod: "CARD",
    });

    expect(drawnTexts).toContain("お支払い方法:");
    expect(drawnTexts).toContain("クレジットカード");
  });

  test("omits the payment row when the transaction type is unknown", async () => {
    await buildInvoicePdf({
      invoiceNo: "INV-2025-05-24-001",
      amountYen: 3300,
      paidAt: "May 24, 2025",
      studentName: "Yuki Tanaka",
      className: "Beginner Conversation",
      durationMin: 30,
      lessonDate: "May 24, 2025",
      language: "en",
      teacherName: "Mika Sato",
    });

    expect(drawnTexts).not.toContain("Payment Method:");
    expect(drawnTexts).toContain("Invoice Date:");
  });

  test("renders a qualified return invoice for a refund", async () => {
    await buildInvoicePdf({
      invoiceNo: "INV-2025-05-24-001",
      amountYen: 3300,
      paidAt: "May 24, 2025",
      studentName: "田中 ゆき",
      className: "初級英会話",
      durationMin: 30,
      lessonDate: "2025年5月24日",
      language: "ja",
      teacherName: "佐藤 美香",
      paymentMethod: "CARD",
      registrationNumber: "T1234567890123",
      creditNote: {
        creditNoteNo: "CRN-20260901-101500-AB12",
        refundedAt: "2026年9月1日",
      },
    });

    // 適格返還請求書 must carry: the issuer's registration number, the date of
    // the return, the date of the original transaction, what was returned, and
    // the amount and tax split by rate.
    expect(drawnTexts).toEqual(
      expect.arrayContaining([
        "適格返還請求書",
        "登録番号: T1234567890123",
        "返還年月日:",
        "2026年9月1日",
        "対象請求書:",
        "INV-2025-05-24-001",
        "元取引年月日:",
        "初級英会話",
        "税抜金額",
        "消費税 (10%)",
      ]),
    );
  });

  test("shows returned amounts as negative so a credit note cannot read as a sale", async () => {
    await buildInvoicePdf({
      invoiceNo: "INV-1",
      amountYen: 3300,
      paidAt: "May 24, 2025",
      studentName: "Yuki Tanaka",
      className: "Beginner Conversation",
      durationMin: 30,
      lessonDate: "May 24, 2025",
      language: "en",
      teacherName: "Mika Sato",
      paymentMethod: "CARD",
      creditNote: { creditNoteNo: "CRN-1", refundedAt: "September 1, 2026" },
    });

    expect(drawnTexts).toEqual(
      expect.arrayContaining(["CREDIT NOTE", "-¥3,300", "-¥3,000", "-¥300"]),
    );
    expect(drawnTexts).not.toContain("¥3,300");
  });

  test("omits the registration line when the teacher is not a registered issuer", async () => {
    await buildInvoicePdf({
      invoiceNo: "INV-1",
      amountYen: 3300,
      paidAt: "May 24, 2025",
      studentName: "Yuki Tanaka",
      className: "Beginner Conversation",
      durationMin: 30,
      lessonDate: "May 24, 2025",
      language: "en",
      teacherName: "Mika Sato",
      paymentMethod: "CARD",
      creditNote: { creditNoteNo: "CRN-1", refundedAt: "September 1, 2026" },
    });

    expect(drawnTexts.join(" ")).not.toContain("Registration No.");
  });

  test("an ordinary invoice is unchanged and still shows positive amounts", async () => {
    await buildInvoicePdf({
      invoiceNo: "INV-1",
      amountYen: 3300,
      paidAt: "May 24, 2025",
      studentName: "Yuki Tanaka",
      className: "Beginner Conversation",
      durationMin: 30,
      lessonDate: "May 24, 2025",
      language: "en",
      teacherName: "Mika Sato",
      paymentMethod: "CARD",
    });

    expect(drawnTexts).toContain("INVOICE");
    expect(drawnTexts).toContain("¥3,300");
    expect(drawnTexts).not.toContain("CREDIT NOTE");
  });
});
