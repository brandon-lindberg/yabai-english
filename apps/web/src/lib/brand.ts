/**
 * The product name, in one place.
 *
 * "English Studio Japan" is the full name and the only one to show a user: an
 * unrelated business trades as "English Studio", and we must not be mistaken
 * for them. UI copy reads it through `common.appName`; anything outside the
 * translation layer — page metadata, the web manifest, exported calendar files
 * — reads it from here.
 */
export const APP_NAME = "English Studio Japan";

/** iCalendar PRODID. Escaped by the ICS writer, so no punctuation concerns. */
export const ICS_PRODUCT_ID = `-//${APP_NAME}//Schedule Export//EN`;

/** Namespace for calendar UIDs. Not a routable host. */
export const CALENDAR_UID_DOMAIN = "english-studio-japan.local";

export function lessonCalendarUid(bookingId: string): string {
  return `booking-${bookingId}@${CALENDAR_UID_DOMAIN}`;
}

/** Shown as an event's location when a lesson has no Meet link yet. */
export function lessonCalendarLocation(): string {
  return `${APP_NAME} lesson`;
}
