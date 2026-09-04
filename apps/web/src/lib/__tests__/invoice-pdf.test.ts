import { beforeEach, describe, expect, test, vi } from "vitest";

const { drawnTexts, drawnTextCalls } = vi.hoisted(() => ({
  drawnTexts: [] as string[],
  drawnTextCalls: [] as Array<{
    text: string;
    x: number;
    y: number;
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
              y: number;
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
              y: options.y,
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
      expect.arrayContaining(["REFUNDED INVOICE", "- ¥3,300", "- ¥3,000", "- ¥300"]),
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
    expect(drawnTexts).not.toContain("REFUNDED INVOICE");
  });
});

describe("buildInvoicePdf — the refunded invoice fits the page", () => {
  /*
    Renaming CREDIT NOTE to REFUNDED INVOICE made the title half again as wide.
    It is right-aligned, so the extra width grew leftwards straight through the
    teacher's name. The meta values were placed at a fixed x with 90pt of room
    and ran off the right edge. And "-¥3,500" put a hyphen hard against the yen
    sign.
  */
  const PAGE_WIDTH = 595;
  const MARGIN = 50;

  // The captured draws are module-level and shared. Without this the assertions
  // below read every earlier test's output as well as this one's.
  beforeEach(() => {
    drawnTexts.length = 0;
    drawnTextCalls.length = 0;
  });

  async function renderCreditNote() {
    await buildInvoicePdf({
      invoiceNo: "INV-20260904-103849-GVDS",
      amountYen: 3500,
      paidAt: "September 4, 2026",
      studentName: "Kotatsu Chatsu",
      className: "Conversation (Eikawa)",
      durationMin: 30,
      lessonDate: "July 18, 2026",
      teacherName: "Brandon Lindberg",
      language: "en",
      paymentMethod: "CARD",
      creditNote: {
        creditNoteNo: "CRN-20260904-103900-G5UM",
        refundedAt: "July 9, 2026",
      },
    });
  }

  function call(match: (text: string) => boolean) {
    return drawnTextCalls.find((c) => match(c.text));
  }

  test("the title does not run into the issuer's name", async () => {
    await renderCreditNote();

    const title = call((t) => t === "REFUNDED INVOICE")!;
    const issuer = call((t) => t === "Brandon Lindberg")!;
    expect(title.x).toBeGreaterThan(issuer.x + issuer.width);
  });

  test("nothing crosses the right margin", async () => {
    await renderCreditNote();

    const overflowing = drawnTextCalls
      .filter((c) => c.x + c.width > PAGE_WIDTH - MARGIN + 0.5)
      .map((c) => `${c.text} @${Math.round(c.x)}+${Math.round(c.width)}`);
    expect(overflowing).toEqual([]);
  });

  test("no two pieces of text sit on top of each other", async () => {
    /*
      Right-aligning the meta values to the margin fixed them running off the
      page and immediately created the opposite problem: a long invoice number
      reaches back far enough to land on top of its own label. Grouping by line
      catches both, and would have caught the first.
    */
    await renderCreditNote();

    /*
      Scoped to the meta block. The crude width model in this harness — a fixed
      factor per character — is far too generous for the table's tight columns
      and reports collisions there that do not exist on the page. The meta rows
      are two items on a line with room between them, which the model handles
      fine, and they are what changed.
    */
    const META_LABELS = [
      "Credit Note No.:",
      "Refund Date:",
      "Against invoice:",
      "Original Invoice Date:",
      "Payment Method:",
    ];
    const byLine = new Map<number, typeof drawnTextCalls>();
    for (const c of drawnTextCalls) {
      const line = byLine.get(c.y) ?? [];
      line.push(c);
      byLine.set(c.y, line);
    }
    for (const [y, line] of byLine) {
      if (!line.some((c) => META_LABELS.includes(c.text))) byLine.delete(y);
    }
    expect(byLine.size).toBe(META_LABELS.length);

    const collisions: string[] = [];
    for (const line of byLine.values()) {
      const sorted = [...line].sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i += 1) {
        const prev = sorted[i - 1];
        if (prev.x + prev.width > sorted[i].x + 0.5) {
          collisions.push(`"${prev.text}" overlaps "${sorted[i].text}"`);
        }
      }
    }
    expect(collisions).toEqual([]);
  });

  test("the name's cap-height lines up with the title's", async () => {
    /*
      Both were drawn at almost the same baseline, but the title is half again
      as large — so its letters rose well above the name and the name appeared
      to hang in the middle of it. Text is positioned by its baseline, so
      aligning the tops means offsetting the smaller one down by the difference
      in cap height.
    */
    await renderCreditNote();

    const title = call((t) => t === "REFUNDED INVOICE")!;
    const name = call((t) => t === "Brandon Lindberg")!;
    const CAP = 0.72;
    const titleTop = title.y + title.size * CAP;
    const nameTop = name.y + name.size * CAP;
    expect(Math.abs(titleTop - nameTop)).toBeLessThan(0.5);
  });

  test("they stay aligned when a long name shrinks the title", async () => {
    // The title is sized to the space left beside the name, so the offset has
    // to follow the size it actually ended up at, not the maximum.
    await buildInvoicePdf({
      invoiceNo: "INV-1",
      amountYen: 3500,
      paidAt: "September 4, 2026",
      studentName: "Kotatsu Chatsu",
      className: "Conversation (Eikawa)",
      durationMin: 30,
      lessonDate: "July 18, 2026",
      teacherName: "Bartholomew Fitzwilliam-Montgomery III",
      language: "en",
      paymentMethod: "CARD",
      creditNote: { creditNoteNo: "CRN-1", refundedAt: "July 9, 2026" },
    });

    const title = call((t) => t === "REFUNDED INVOICE")!;
    const name = call((t) => t.startsWith("Bartholomew"))!;
    const CAP = 0.72;
    expect(title.size).toBeLessThan(30);
    expect(Math.abs(title.y + title.size * CAP - (name.y + name.size * CAP))).toBeLessThan(0.5);
  });

  test("the issuer's name starts at the left margin, like everything else", async () => {
    // It sat at an arbitrary 58pt indent, aligned to nothing — not the rule
    // beneath it, not the table, not the page.
    await renderCreditNote();

    expect(call((t) => t === "Brandon Lindberg")!.x).toBe(MARGIN);
  });

  test("the minus is not welded to the yen sign", async () => {
    await renderCreditNote();

    const negative = drawnTexts.filter((t) => t.startsWith("-") && t.includes("¥"));
    expect(negative.length).toBeGreaterThan(0);
    for (const t of negative) {
      expect(t).not.toMatch(/^-¥/);
    }
  });

  test("still reads as a return, with negative amounts", async () => {
    await renderCreditNote();

    expect(drawnTexts.some((t) => t.includes("3,500") && t.startsWith("-"))).toBe(true);
  });
});

