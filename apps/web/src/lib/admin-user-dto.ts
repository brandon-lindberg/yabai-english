import type { TeacherProfile } from "@prisma/client";

export type AdminTeacherProfileDto = Omit<TeacherProfile, "googleCalendarRefreshToken"> & {
  calendarConnected: boolean;
};

export function teacherProfileToAdminDto(tp: TeacherProfile | null): AdminTeacherProfileDto | null {
  if (!tp) return null;
  const { googleCalendarRefreshToken, ...rest } = tp;
  return {
    ...rest,
    calendarConnected: Boolean(googleCalendarRefreshToken),
  };
}
