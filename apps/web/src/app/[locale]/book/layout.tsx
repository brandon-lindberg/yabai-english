import { requireLearningSiteForPage } from "@/lib/learning-site-page";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { requireRoleOnboardingComplete } from "@/lib/onboarding-gate";
import { getLocale } from "next-intl/server";
import { FeatureMessages } from "@/components/i18n/feature-messages";

/**
 * Guests may browse `/book` and teacher profiles without signing in.
 * Onboarding completion is enforced only for signed-in students/teachers.
 */
export default async function BookLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const session = await auth();
  await requireLearningSiteForPage("/book", session?.user?.learningLanguage);
  if (session?.user) {
    await requireRoleOnboardingComplete(locale, {
      id: session.user.id,
      role: session.user.role,
    });
  }
  return <FeatureMessages scope="book">{children}</FeatureMessages>;
}
