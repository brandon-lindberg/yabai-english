import type { ReactNode } from "react";
import { auth } from "@/auth";
import { requireRoleOnboardingComplete } from "@/lib/onboarding-gate";
import { getLocale } from "next-intl/server";

/**
 * Guests may browse `/book` and teacher profiles without signing in.
 * Onboarding completion is enforced only for signed-in students/teachers.
 */
export default async function BookLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const session = await auth();
  if (session?.user) {
    await requireRoleOnboardingComplete(locale, {
      id: session.user.id,
      role: session.user.role,
    });
  }
  return children;
}
