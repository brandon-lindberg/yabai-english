import { getOnboardingRedirectForRole } from "@/lib/onboarding-redirect";

type AuthenticatedDefaultRouteInput = {
  role: string;
  studentOnboardingCompleted?: boolean;
  teacherOnboardingCompleted?: boolean;
};

export function getAuthenticatedDefaultRoute(
  input: AuthenticatedDefaultRouteInput,
): "/dashboard" | "/onboarding" | "/onboarding/teacher" {
  return getOnboardingRedirectForRole(input) ?? "/dashboard";
}
