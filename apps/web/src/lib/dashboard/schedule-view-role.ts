import type { Role } from "@/generated/prisma/client";

/**
 * Schedule and completed-lesson pages should load marketplace teacher bookings
 * whenever the user is not a student — matching {@link dashboard/page.tsx}
 * teacher home. (e.g. SUPER_ADMIN with a teacher profile teaches lessons too.)
 */
export function shouldLoadTeacherBookingsOnSchedule(role: Role): boolean {
  return role !== "STUDENT";
}
