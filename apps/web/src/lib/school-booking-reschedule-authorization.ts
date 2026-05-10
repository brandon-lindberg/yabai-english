import {
  isSchoolAdmin,
  type MembershipForAuth,
} from "@/lib/org-authorization";

/** Active school admin / org admin, or the assigned teacher for this class. */
export function canRescheduleSchoolClassBooking(
  caller: MembershipForAuth | null,
  schoolId: string,
  bookingTeacherMembershipId: string,
): boolean {
  if (!caller || caller.status !== "ACTIVE") return false;
  if (isSchoolAdmin(caller, schoolId)) return true;
  return (
    caller.orgRole === "TEACHER" &&
    caller.id === bookingTeacherMembershipId &&
    caller.schoolId === schoolId
  );
}
