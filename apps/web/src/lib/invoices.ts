export function buildInvoiceNumber(now: Date) {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const t = String(now.getUTCHours()).padStart(2, "0")
    + String(now.getUTCMinutes()).padStart(2, "0")
    + String(now.getUTCSeconds()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${y}${m}${d}-${t}-${rand}`;
}
