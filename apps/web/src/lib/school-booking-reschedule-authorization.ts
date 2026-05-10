import {
  isSchoolAdmin,
  type MembershipForAuth,
} from "@/lib/org-authorization";

/** Org-wide or school admin: may reschedule a class immediately (no approval). */
export function canDirectRescheduleSchoolClassBooking(
  caller: MembershipForAuth | null,
  schoolId: string,
): boolean {
  if (!caller || caller.status !== "ACTIVE") return false;
  return isSchoolAdmin(caller, schoolId);
}

/** Assigned class teacher: may submit a reschedule request for admin approval. */
export function canSubmitSchoolClassRescheduleRequest(
  caller: MembershipForAuth | null,
  schoolId: string,
  bookingTeacherMembershipId: string,
): boolean {
  if (!caller || caller.status !== "ACTIVE") return false;
  return (
    caller.orgRole === "TEACHER" &&
    caller.id === bookingTeacherMembershipId &&
    caller.schoolId === schoolId
  );
}
