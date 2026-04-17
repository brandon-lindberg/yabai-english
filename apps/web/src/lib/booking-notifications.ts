import { DateTime } from "luxon";

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
  const zoned = DateTime.fromJSDate(startsAt, { zone: "utc" }).setZone(timezone);
  const zoneLabel = zoned.offsetNameShort ?? timezone;
  const dateJa = zoned.setLocale("ja").toFormat("yyyy/LL/dd (ccc) HH:mm");
  const dateEn = zoned.setLocale("en").toFormat("ccc, LLL d, yyyy HH:mm");
  const { displayJa, displayEn } = resolveStudentLabel(studentName);

  return {
    titleJa: `新しい予約: ${displayJa} さんからのレッスン`,
    titleEn: `New booking from ${displayEn}`,
    bodyJa: `${displayJa} さんが ${dateJa} (${zoneLabel}) のレッスンを予約しました。`,
    bodyEn: `${displayEn} booked a lesson on ${dateEn} (${zoneLabel}).`,
  };
}
