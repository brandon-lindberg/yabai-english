import { deleteMeetLessonEvent, removeMeetLessonEventAttendee } from "./google-calendar";
import { bookingOwnsItsCalendarEvent } from "./booking-calendar-ownership";

type CalendarBooking = {
  studentId: string; groupLessonSessionId?: string | null; googleEventId?: string | null;
  googleCalendarId?: string | null; studentGoogleEventId?: string | null;
  student?: { email?: string | null } | null;
  teacher: { userId: string; googleCalendarRefreshToken?: string | null; calendarId?: string | null };
};
/** Shared by policy cancellation and a fully refunded Dashboard booking. A seat never owns the class event. */
export async function cleanCancelledBookingCalendar(booking: CalendarBooking) {
  const organizer = { organizerUserId: booking.teacher.userId, refreshTokenEncrypted: booking.teacher.googleCalendarRefreshToken ?? null,
    calendarId: booking.googleCalendarId ?? booking.teacher.calendarId };
  await Promise.all([
    booking.googleEventId ? bookingOwnsItsCalendarEvent(booking)
      ? deleteMeetLessonEvent({ ...organizer, eventId: booking.googleEventId })
      : booking.student?.email ? removeMeetLessonEventAttendee({ ...organizer, eventId: booking.googleEventId, attendeeEmail: booking.student.email }) : Promise.resolve(false)
      : Promise.resolve(false),
    booking.studentGoogleEventId ? deleteMeetLessonEvent({ organizerUserId: booking.studentId, refreshTokenEncrypted: null, eventId: booking.studentGoogleEventId }) : Promise.resolve(false),
  ]);
}
