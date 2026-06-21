import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { calculateTaxIncludedInvoiceTotals } from "@/lib/invoice-totals";

export type InvoicePdfLanguage = "en" | "ja";

const japaneseRegularFontPath = join(
  process.cwd(),
  "node_modules",
  "@expo-google-fonts",
  "noto-sans-jp",
  "400Regular",
  "NotoSansJP_400Regular.ttf",
);
const japaneseBoldFontPath = join(
  process.cwd(),
  "node_modules",
  "@expo-google-fonts",
  "noto-sans-jp",
  "700Bold",
  "NotoSansJP_700Bold.ttf",
);

let japaneseRegularFontBytes: Promise<Uint8Array> | undefined;
let japaneseBoldFontBytes: Promise<Uint8Array> | undefined;

const invoiceCopy = {
  en: {
    title: "INVOICE",
    dateLabel: "Invoice Date:",
    thankYou: "Thank you for learning with English Studio Japan!",
    item: "Item",
    className: "Class",
    duration: "Duration",
    price: "Price (JPY)",
    durationValue: (minutes: number) => `${minutes} min`,
    subtotal: "Total before tax",
    tax: "Tax (10%)",
    finalTotal: "Final Total",
    currencyNote: "All amounts are in Japanese Yen (JPY).",
    lessonDate: (date: string) => `Lesson Date: ${date}`,
  },
  ja: {
    title: "請求書",
    dateLabel: "請求日:",
    thankYou: "English Studio Japanをご利用いただきありがとうございます。",
    item: "項目",
    className: "クラス",
    duration: "時間",
    price: "金額 (JPY)",
    durationValue: (minutes: number) => `${minutes}分`,
    subtotal: "税抜金額",
    tax: "消費税 (10%)",
    finalTotal: "合計金額",
    currencyNote: "金額はすべて日本円 (JPY) です。",
    lessonDate: (date: string) => `レッスン日: ${date}`,
  },
} satisfies Record<
  InvoicePdfLanguage,
  {
    title: string;
    dateLabel: string;
    thankYou: string;
    item: string;
    className: string;
    duration: string;
    price: string;
    durationValue: (minutes: number) => string;
    subtotal: string;
    tax: string;
    finalTotal: string;
    currencyNote: string;
    lessonDate: (date: string) => string;
  }
>;

export async function buildInvoicePdf(input: {
  invoiceNo: string;
  amountYen: number;
  paidAt: string;
  studentName: string;
  className: string;
  durationMin: number;
  lessonDate: string;
  language?: InvoicePdfLanguage;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const language = input.language ?? "en";
  const copy = invoiceCopy[language];
  const { font, fontBold, latinFont } = await loadInvoiceFonts(doc, language);

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  const navy = rgb(0.02, 0.12, 0.33);
  const black = rgb(0.08, 0.09, 0.13);
  const gray = rgb(0.35, 0.37, 0.42);
  const lightGray = rgb(0.93, 0.94, 0.95);
  const mint = rgb(0.86, 0.94, 0.92);
  const lineColor = rgb(0.78, 0.8, 0.84);
  const white = rgb(1, 1, 1);
  const totals = calculateTaxIncludedInvoiceTotals(input.amountYen);
  const formatYen = (amountYen: number) =>
    `¥${amountYen.toLocaleString("ja-JP")}`;
  const drawRightText = (
    text: string,
    rightX: number,
    textY: number,
    size: number,
    textFont = font,
    color = black,
  ) => {
    page.drawText(text, {
      x: rightX - textFont.widthOfTextAtSize(text, size),
      y: textY,
      size,
      font: textFont,
      color,
    });
  };

  page.drawText("English Studio Japan", {
    x: margin + 58,
    y: y - 8,
    size: 20,
    font: fontBold,
    color: navy,
  });
  page.drawText("English Learning Platform", {
    x: margin + 58,
    y: y - 26,
    size: 10,
    font,
    color: gray,
  });

  page.drawText(copy.title, {
    x: width - margin - 152,
    y: y - 4,
    size: 30,
    font: fontBold,
    color: navy,
  });
  drawRightText(input.invoiceNo, width - margin, y - 28, 10, latinFont, black);

  y -= 72;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: lineColor,
  });

  y -= 28;
  page.drawText(copy.dateLabel, {
    x: width - margin - 160,
    y,
    size: 10,
    font,
    color: black,
  });
  page.drawText(input.paidAt, {
    x: width - margin - 70,
    y,
    size: 10,
    font,
    color: black,
  });

  y -= 70;
  page.drawText(input.studentName, {
    x: margin + 52,
    y,
    size: 16,
    font: fontBold,
    color: navy,
  });
  y -= 20;
  page.drawText(copy.thankYou, {
    x: margin + 52,
    y,
    size: 10,
    font,
    color: black,
  });

  y -= 42;
  const tableX = margin;
  const tableWidth = width - margin * 2;
  const headerHeight = 32;
  const rowHeight = 54;
  const columns = {
    item: tableX,
    className: tableX + 64,
    duration: tableX + 310,
    price: tableX + 435,
    end: tableX + tableWidth,
  };

  page.drawRectangle({
    x: tableX,
    y: y - headerHeight + 8,
    width: tableWidth,
    height: headerHeight,
    color: navy,
  });

  const headerY = y - 14;
  page.drawText(copy.item, {
    x: columns.item + 22,
    y: headerY,
    size: 10,
    font: fontBold,
    color: white,
  });
  page.drawText(copy.className, {
    x: columns.className + 20,
    y: headerY,
    size: 10,
    font: fontBold,
    color: white,
  });
  page.drawText(copy.duration, {
    x: columns.duration + 16,
    y: headerY,
    size: 10,
    font: fontBold,
    color: white,
  });
  drawRightText(copy.price, columns.end - 22, headerY, 10, fontBold, white);

  y -= headerHeight + rowHeight;
  page.drawRectangle({
    x: tableX,
    y: y + 8,
    width: tableWidth,
    height: rowHeight,
    borderColor: lightGray,
    borderWidth: 1,
    color: white,
  });

  const rowTextY = y + 28;
  page.drawText("1", {
    x: columns.item + 28,
    y: rowTextY,
    size: 10,
    font,
    color: black,
  });
  page.drawText(input.className, {
    x: columns.className + 18,
    y: rowTextY,
    size: 10,
    font,
    color: black,
  });
  page.drawText(copy.durationValue(input.durationMin), {
    x: columns.duration + 22,
    y: rowTextY,
    size: 10,
    font,
    color: black,
  });
  drawRightText(
    formatYen(input.amountYen),
    columns.end - 22,
    rowTextY,
    11,
    fontBold,
  );

  y -= 52;
  const totalsLabelX = width - margin - 240;
  const totalsValueRightX = width - margin - 24;
  const drawTotalRow = (
    label: string,
    value: string,
    textY: number,
    bold = false,
  ) => {
    page.drawText(label, {
      x: totalsLabelX,
      y: textY,
      size: bold ? 14 : 10,
      font: bold ? fontBold : font,
      color: bold ? navy : black,
    });
    drawRightText(
      value,
      totalsValueRightX,
      textY,
      bold ? 16 : 11,
      bold ? fontBold : fontBold,
      bold ? navy : black,
    );
  };

  drawTotalRow(copy.subtotal, formatYen(totals.subtotalYen), y);
  y -= 34;
  drawTotalRow(copy.tax, formatYen(totals.taxYen), y);
  y -= 46;
  page.drawRectangle({
    x: totalsLabelX - 24,
    y: y - 12,
    width: 280,
    height: 34,
    color: mint,
  });
  drawTotalRow(copy.finalTotal, formatYen(totals.totalYen), y, true);

  y -= 90;
  page.drawRectangle({
    x: margin,
    y,
    width: width - margin * 2,
    height: 60,
    borderColor: lineColor,
    borderWidth: 1,
    color: white,
  });
  page.drawText(copy.currencyNote, {
    x: margin + 40,
    y: y + 35,
    size: 10,
    font,
    color: black,
  });
  page.drawText(copy.thankYou, {
    x: margin + 40,
    y: y + 20,
    size: 10,
    font,
    color: black,
  });

  page.drawText("English Studio Japan", {
    x: width / 2 - 58,
    y: margin,
    size: 10,
    font: fontBold,
    color: navy,
  });
  page.drawText("English Learning Platform", {
    x: width / 2 - 65,
    y: margin - 16,
    size: 9,
    font,
    color: gray,
  });

  page.drawText(copy.lessonDate(input.lessonDate), {
    x: margin,
    y: margin - 16,
    size: 8,
    font,
    color: gray,
  });

  return doc.save();
}

async function loadInvoiceFonts(
  doc: PDFDocument,
  language: InvoicePdfLanguage,
): Promise<{ font: PDFFont; fontBold: PDFFont; latinFont: PDFFont; latinFontBold: PDFFont }> {
  const latinFont = await doc.embedFont(StandardFonts.Helvetica);
  const latinFontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  if (language === "en") {
    return { font: latinFont, fontBold: latinFontBold, latinFont, latinFontBold };
  }

  doc.registerFontkit(fontkit);
  japaneseRegularFontBytes ??= readFile(japaneseRegularFontPath);
  japaneseBoldFontBytes ??= readFile(japaneseBoldFontPath);

  const [regularBytes, boldBytes] = await Promise.all([
    japaneseRegularFontBytes,
    japaneseBoldFontBytes,
  ]);

  const font = await doc.embedFont(regularBytes, { subset: false });
  const fontBold = await doc.embedFont(boldBytes, { subset: false });

  return { font, fontBold, latinFont, latinFontBold };
}
