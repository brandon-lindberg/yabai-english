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
  role: "STUDENT" | "TEACHER" | "ADMIN",
  manualOverride: boolean,
) {
  if (role === "STUDENT") return false;
  return manualOverride;
}
