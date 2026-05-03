/**
 * Gate for /book/teachers/[teacherId]: the booking flow is for students and
 * guests only. Teachers and admins are redirected away from student booking UI.
 */
export function redirectTargetForTeacherBookingPage(input: {
  role: string | undefined;
  requestedTeacherProfileId: string;
  /** Logged-in teacher's TeacherProfile.id, when role is TEACHER */
  viewerTeacherProfileId: string | null;
}): "/dashboard" | null {
  const { role, requestedTeacherProfileId, viewerTeacherProfileId } = input;
  void requestedTeacherProfileId;
  void viewerTeacherProfileId;
  if (!role) return null;
  if (role === "SUPER_ADMIN") return "/dashboard";
  if (role === "TEACHER") return "/dashboard";
  return null;
}
