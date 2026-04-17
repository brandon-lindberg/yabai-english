/**
 * Gate for /book/teachers/[teacherId]: students and signed-out visitors may browse;
 * teachers may only open their own page (public preview); admins are redirected.
 */
export function redirectTargetForTeacherBookingPage(input: {
  role: string | undefined;
  requestedTeacherProfileId: string;
  /** Logged-in teacher's TeacherProfile.id, when role is TEACHER */
  viewerTeacherProfileId: string | null;
}): "/dashboard" | null {
  const { role, requestedTeacherProfileId, viewerTeacherProfileId } = input;
  if (!role) return null;
  if (role === "ADMIN") return "/dashboard";
  if (role === "TEACHER") {
    if (viewerTeacherProfileId === requestedTeacherProfileId) return null;
    return "/dashboard";
  }
  return null;
}
