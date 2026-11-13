import { IANAZone } from "luxon";

export const DEFAULT_VIEWER_TIME_ZONE = "Asia/Tokyo";
export const VIEWER_TIME_ZONE_COOKIE = "viewerTimeZone";

export function validViewerTimeZone(timeZone?: string | null): string | undefined {
  return timeZone && IANAZone.isValidZone(timeZone) ? timeZone : undefined;
}

/** Saved account zones can outlive the browser or settings that supplied them. */
export function resolveViewerTimeZone(timeZone?: string | null): string {
  return validViewerTimeZone(timeZone) ?? DEFAULT_VIEWER_TIME_ZONE;
}
