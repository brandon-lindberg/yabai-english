export function buildInvoiceCsv(input: {
  invoiceNo: string;
  amountYen: number;
  paidAtIso: string;
  bookingId: string;
  studentEmail: string;
  teacherName: string;
}) {
  const header =
    "invoiceNo,amountYen,paidAt,bookingId,studentEmail,teacherName";
  const row = [
    input.invoiceNo,
    String(input.amountYen),
    input.paidAtIso,
    input.bookingId,
    input.studentEmail,
    input.teacherName,
  ].join(",");
  return `${header}\n${row}\n`;
}
