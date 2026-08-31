/**
 * How far ahead a student must book. Teachers and admins can waive it with a
 * written reason, but nothing else can.
 */
export const BOOKING_MINIMUM_LEAD_HOURS = 48;

export function isBookingOutsideLeadWindow({
  start,
  now = new Date(),
  minimumHours,
}: {
  start: Date;
  now?: Date;
  minimumHours: number;
}) {
  const diffMs = start.getTime() - now.getTime();
  return diffMs >= minimumHours * 60 * 60 * 1000;
}

export function canBypassLeadTimeWindow(
  role: "STUDENT" | "TEACHER" | "SUPER_ADMIN",
  manualOverride: boolean,
) {
  if (role === "STUDENT") return false;
  return manualOverride;
}
