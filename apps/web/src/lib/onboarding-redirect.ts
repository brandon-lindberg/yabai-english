type Role = "STUDENT" | "TEACHER" | "ADMIN" | string;

export function getOnboardingRedirectForRole(input: {
  role: Role;
  studentOnboardingCompleted?: boolean;
  teacherOnboardingCompleted?: boolean;
}): "/onboarding" | "/onboarding/teacher" | null {
  if (input.role === "STUDENT") {
    return input.studentOnboardingCompleted ? null : "/onboarding";
  }
  if (input.role === "TEACHER") {
    return input.teacherOnboardingCompleted ? null : "/onboarding/teacher";
  }
  return null;
}
