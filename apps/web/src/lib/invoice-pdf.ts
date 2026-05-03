import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { calculateTaxIncludedInvoiceTotals } from "@/lib/invoice-totals";

export async function buildInvoicePdf(input: {
  invoiceNo: string;
  amountYen: number;
  paidAt: string;
  studentName: string;
  className: string;
  durationMin: number;
  lessonDate: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

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

  page.drawText("INVOICE", {
    x: width - margin - 152,
    y: y - 4,
    size: 30,
    font: fontBold,
    color: navy,
  });
  page.drawText(input.invoiceNo, {
    x: width - margin - 110,
    y: y - 28,
    size: 10,
    font,
    color: black,
  });

  y -= 72;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: lineColor,
  });

  y -= 28;
  page.drawText("Invoice Date:", {
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
  page.drawText("Thank you for learning with English Studio Japan!", {
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
  page.drawText("Item", {
    x: columns.item + 22,
    y: headerY,
    size: 10,
    font: fontBold,
    color: white,
  });
  page.drawText("Class", {
    x: columns.className + 20,
    y: headerY,
    size: 10,
    font: fontBold,
    color: white,
  });
  page.drawText("Duration", {
    x: columns.duration + 16,
    y: headerY,
    size: 10,
    font: fontBold,
    color: white,
  });
  page.drawText("Price (JPY)", {
    x: columns.price + 22,
    y: headerY,
    size: 10,
    font: fontBold,
    color: white,
  });

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
  page.drawText(`${input.durationMin} min`, {
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

  drawTotalRow("Total before tax", formatYen(totals.subtotalYen), y);
  y -= 34;
  drawTotalRow("Tax (10%)", formatYen(totals.taxYen), y);
  y -= 46;
  page.drawRectangle({
    x: totalsLabelX - 24,
    y: y - 12,
    width: 280,
    height: 34,
    color: mint,
  });
  drawTotalRow("Final Total", formatYen(totals.totalYen), y, true);

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
  page.drawText("All amounts are in Japanese Yen (JPY).", {
    x: margin + 40,
    y: y + 35,
    size: 10,
    font,
    color: black,
  });
  page.drawText("Thank you for learning with English Studio Japan!", {
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

  page.drawText(`Lesson Date: ${input.lessonDate}`, {
    x: margin,
    y: margin - 16,
    size: 8,
    font,
    color: gray,
  });

  return doc.save();
}
