import { prisma } from "@/lib/prisma";
import { createMeetLessonEvent, deleteMeetLessonEvent } from "@/lib/google-calendar";
import { lessonProductNames } from "@/lib/lesson-product-catalog";
import { maybeCreateStudentMirrorLessonEvent } from "@/lib/booking-payment-confirmation";
import { isStaleBookingMutation } from "@/lib/booking-conflict";

/** Shared calendar recovery for manual retries and restored replacement lessons. */
export async function ensureBookingCalendar(bookingId: string, options: { restoreStudentMirror?: boolean } = {}) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: {
    lessonProduct: true, student: { select: { email: true } }, teacher: { include: { user: { select: { email: true } } } },
  } });
  if (!booking) return { ok: false, httpStatus: 404, error: "Not found" };
  if (booking.status !== "CONFIRMED") return { ok: false, httpStatus: 409, error: "Booking is not active" };
  if (booking.googleEventId) return { ok: true, httpStatus: 200, alreadyCreated: true, meetUrl: booking.meetUrl, googleEventId: booking.googleEventId };
  const attendeeEmails = [booking.student.email, booking.teacher.user.email].filter(Boolean) as string[];
  const summary = `Lesson — ${lessonProductNames(booking.lessonProduct, booking.learningLanguage).nameEn}`;
  const organizer = { organizerUserId: booking.teacher.userId, refreshTokenEncrypted: booking.teacher.googleCalendarRefreshToken, calendarId: booking.teacher.calendarId };
  const meet = await createMeetLessonEvent({ ...organizer, summary, start: booking.startsAt, end: booking.endsAt, attendeeEmails });
  if (!meet.googleEventId) return { ok: false, httpStatus: 424, error: "Calendar invite was not created",
    code: meet.errorCode ?? "CALENDAR_CREATE_FAILED", message: meet.errorMessage ?? "Reconnect Google Calendar and try creating the invite again." };
  let updated;
  try {
    updated = await prisma.booking.update({ where: { id: booking.id, status: "CONFIRMED", startsAt: booking.startsAt, googleEventId: null },
      data: { meetUrl: meet.meetUrl, googleEventId: meet.googleEventId, googleCalendarId: booking.teacher.calendarId ?? "primary",
        meetCode: meet.meetUrl?.split("/").pop() ?? null },
      select: { id: true, meetUrl: true, googleEventId: true, googleCalendarId: true } });
  } catch (error) {
    await deleteMeetLessonEvent({ ...organizer, eventId: meet.googleEventId });
    if (isStaleBookingMutation(error)) return { ok: false, httpStatus: 409, error: "The booking changed during calendar recovery." };
    throw error;
  }
  if (options.restoreStudentMirror) {
    const mirror = await maybeCreateStudentMirrorLessonEvent({ studentUserId: booking.studentId, summary, startsAt: booking.startsAt, endsAt: booking.endsAt, attendeeEmails });
    if (mirror.googleEventId) await prisma.booking.update({ where: { id: booking.id, status: "CONFIRMED", startsAt: booking.startsAt }, data: { studentGoogleEventId: mirror.googleEventId } });
  }
  return { ok: true, httpStatus: 200, booking: updated };
}
