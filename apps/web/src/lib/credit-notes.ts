import { prisma } from "@/lib/prisma";

/**
 * A credit note's number, in the same shape as an invoice number so the two
 * sort together in an export and are told apart by their prefix alone.
 */
export function buildCreditNoteNumber(now: Date) {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const t =
    String(now.getUTCHours()).padStart(2, "0") +
    String(now.getUTCMinutes()).padStart(2, "0") +
    String(now.getUTCSeconds()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CRN-${y}${m}${d}-${t}-${rand}`;
}

/**
 * Gives a succeeded refund its credit note number, once.
 *
 * A number is only issued when the money has actually gone back: a pending or
 * failed refund has nothing to document, and issuing early would put a number
 * on a document that may never be owed. Already-numbered refunds keep the
 * number they have — it is the document's identity, and reissuing would leave
 * two numbers for one return.
 */
export async function ensureCreditNoteNumber(refundId: string): Promise<string | null> {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    select: { id: true, status: true, creditNoteNo: true },
  });
  if (!refund) return null;
  if (refund.creditNoteNo) return refund.creditNoteNo;
  if (refund.status !== "SUCCEEDED") return null;

  const updated = await prisma.refund.update({
    where: { id: refund.id },
    data: { creditNoteNo: buildCreditNoteNumber(new Date()) },
    select: { creditNoteNo: true },
  });
  return updated.creditNoteNo;
}
