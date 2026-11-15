/** Monday 10:00 JST, matching the release teacher's recurring availability. */
export function refundableMonday(now = new Date()) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + ((8 - date.getUTCDay()) % 7 || 7));
  date.setUTCHours(1, 0, 0, 0);
  // Keep a full day's margin beyond the 48-hour refund boundary, including
  // Friday/weekend CI runs that would otherwise exercise late cancellation.
  if (date.getTime() - now.getTime() < 72 * 3600_000) date.setUTCDate(date.getUTCDate() + 7);
  return date;
}
