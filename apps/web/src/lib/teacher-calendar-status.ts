/**
 * Whether a teacher can create Meet / Calendar events.
 * New flow: `GoogleIntegrationSettings.calendarConnected`.
 * Legacy: `TeacherProfile.googleCalendarRefreshToken` (still honored by booking + calendar code).
 */
export function isTeacherCalendarReady(input: {
  calendarConnected: boolean | null | undefined;
  legacyRefreshTokenPresent: boolean;
}): boolean {
  if (input.calendarConnected === true) return true;
  return input.legacyRefreshTokenPresent;
}
