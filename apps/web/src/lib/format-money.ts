/**
 * Format a yen amount for display.
 *
 * The codebase was split between `JPY 5,000` and `¥5,000`, both built by hand
 * from `Number.toLocaleString()` with no locale argument — which silently
 * formats in the *server's* locale on server components. Intl handles the
 * symbol, the grouping and the placement per locale, so ja and en each get
 * what their readers expect.
 *
 * JPY has no minor unit, hence the zero fraction digits.
 */
export function formatYen(amountYen: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amountYen);
}
