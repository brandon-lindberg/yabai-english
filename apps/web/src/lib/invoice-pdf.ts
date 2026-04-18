import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function buildInvoicePdf(input: {
  invoiceNo: string;
  amountYen: number;
  paidAt: string;
  studentName: string;
  teacherName: string;
  lessonType: string;
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

  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const lineColor = rgb(0.8, 0.8, 0.8);

  // --- Title ---
  page.drawText("INVOICE", {
    x: margin,
    y,
    size: 28,
    font: fontBold,
    color: black,
  });
  y -= 16;

  page.drawText(input.invoiceNo, {
    x: margin,
    y,
    size: 10,
    font,
    color: gray,
  });
  y -= 30;

  // --- Divider ---
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: lineColor,
  });
  y -= 30;

  // --- Info rows ---
  const drawRow = (label: string, value: string) => {
    page.drawText(label, {
      x: margin,
      y,
      size: 11,
      font: fontBold,
      color: gray,
    });
    page.drawText(value, {
      x: margin + 140,
      y,
      size: 11,
      font,
      color: black,
    });
    y -= 24;
  };

  drawRow("Date Issued", input.paidAt);
  drawRow("Lesson Date", input.lessonDate);
  y -= 10;
  drawRow("Student", input.studentName);
  drawRow("Teacher", input.teacherName);
  y -= 10;
  drawRow("Lesson Type", input.lessonType);
  drawRow("Duration", `${input.durationMin} min`);

  y -= 10;

  // --- Divider ---
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: lineColor,
  });
  y -= 30;

  // --- Total ---
  page.drawText("Total", {
    x: margin,
    y,
    size: 14,
    font: fontBold,
    color: black,
  });

  const amount =
    input.amountYen === 0
      ? "Free"
      : `¥${input.amountYen.toLocaleString("ja-JP")}`;

  page.drawText(amount, {
    x: width - margin - fontBold.widthOfTextAtSize(amount, 20),
    y,
    size: 20,
    font: fontBold,
    color: black,
  });

  y -= 40;

  // --- Footer ---
  page.drawText("Thank you for your lesson!", {
    x: margin,
    y,
    size: 10,
    font,
    color: gray,
  });

  return doc.save();
}
