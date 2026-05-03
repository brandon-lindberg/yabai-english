export function buildInvoiceCsv(input: {
  invoiceNo: string;
  studentName: string;
  className: string;
  durationMin: number;
  priceYen: number;
  subtotalYen: number;
  taxYen: number;
  totalYen: number;
  paidAtIso: string;
  bookingId: string;
  studentEmail: string;
  teacherName: string;
}) {
  const header =
    "invoiceNo,studentName,className,durationMin,priceYen,subtotalYen,taxYen,totalYen,paidAt,bookingId,studentEmail,teacherName";
  const row = [
    input.invoiceNo,
    input.studentName,
    input.className,
    String(input.durationMin),
    String(input.priceYen),
    String(input.subtotalYen),
    String(input.taxYen),
    String(input.totalYen),
    input.paidAtIso,
    input.bookingId,
    input.studentEmail,
    input.teacherName,
  ]
    .map(csvCell)
    .join(",");
  return `${header}\n${row}\n`;
}

function csvCell(value: string) {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}
