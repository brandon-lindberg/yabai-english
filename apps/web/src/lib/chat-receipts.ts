export function getReceiptKey(readAt: string | null) {
  return readAt ? "read" : "delivered";
}
