/**
 * Whether a booking's calendar event is the booking's alone to change.
 *
 * A private lesson owns its event: cancelling deletes it, rescheduling moves
 * it. A seat in a group class does not — `booking.googleEventId` there is the
 * *class's* event, mirrored onto every seat so the dashboard, the ICS feed and
 * the notes link can keep reading one field. Deleting or moving it on one
 * student's behalf takes the class off everybody else's calendar, or drags
 * them all to a new time.
 *
 * One rule, because the cancel path and the reschedule path both had it
 * wrong in the same way, and either fixed alone would still leave the bug.
 */
export function bookingOwnsItsCalendarEvent(booking: {
  groupLessonSessionId?: string | null;
}): boolean {
  return !booking.groupLessonSessionId;
}
