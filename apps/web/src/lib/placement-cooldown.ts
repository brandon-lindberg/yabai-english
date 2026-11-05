import { DateTime } from "luxon";
import { resolveViewerTimeZone } from "./viewer-time-zone";

/** Opens at the start of the calendar day one month after the local completion date. */
export function placementRetakeStatus(completedAt: Date | null | undefined, timeZone?: string | null, now = Date.now()) {
  const boundary = completedAt
    ? DateTime.fromJSDate(completedAt, { zone: resolveViewerTimeZone(timeZone) }).plus({ months: 1 }).startOf("day")
    : null;
  return {
    allowed: boundary === null || now >= boundary.toMillis(),
    eligibleAt: boundary?.toUTC().toISO() ?? null,
    eligibleDate: boundary?.toISODate() ?? null,
  };
}
