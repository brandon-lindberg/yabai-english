import { formatLessonInstant } from "./format-lesson-datetime";
import { resolveViewerTimeZone } from "./viewer-time-zone";

/** Old booking notices stored an offset or zone abbreviation after the clock time. */
export function stripLegacyBookingTimeZone(body: string): string {
  return body.replace(/(\d{2}:\d{2}) \((?:(?:GMT|UTC)[+−-][0-9:]+|[A-Z]{2,6}|[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+)+)\)/g, "$1");
}

export type TeacherBookingNotificationInput = {
  studentName: string | null;
  startsAt: Date;
  timezone: string;
};

export type LocalizedNotification = {
  titleJa: string;
  titleEn: string;
  bodyJa: string;
  bodyEn: string;
};

function resolveStudentLabel(name: string | null): {
  displayJa: string;
  displayEn: string;
} {
  const trimmed = name?.trim();
  if (trimmed) {
    return { displayJa: trimmed, displayEn: trimmed };
  }
  return { displayJa: "生徒", displayEn: "a student" };
}

/**
 * Builds the notification payload shown to a teacher when a student's booking
 * becomes CONFIRMED. Times are rendered in the teacher's local timezone so the
 * date/time matches what they see on their dashboard schedule.
 */
export function buildTeacherBookingConfirmedNotification({
  studentName,
  startsAt,
  timezone,
}: TeacherBookingNotificationInput): LocalizedNotification {
  const iso = startsAt.toISOString();
  const zone = resolveViewerTimeZone(timezone);
  const dateJa = formatLessonInstant(iso, "ja", zone);
  const dateEn = formatLessonInstant(iso, "en", zone);
  const { displayJa, displayEn } = resolveStudentLabel(studentName);

  return {
    titleJa: `新しい予約: ${displayJa} さんからのレッスン`,
    titleEn: `New booking from ${displayEn}`,
    bodyJa: `${displayJa} さんが ${dateJa} のレッスンを予約しました。`,
    bodyEn: `${displayEn} booked a lesson on ${dateEn}.`,
  };
}
