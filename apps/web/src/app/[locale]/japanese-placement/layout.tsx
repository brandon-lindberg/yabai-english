import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAuth, requireStudentOnboardingComplete } from "@/lib/onboarding-gate";
import { FeatureMessages } from "@/components/i18n/feature-messages";

export default async function JapanesePlacementLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const user = await requireAuth(locale);
  if (user.role !== "STUDENT" || user.learningLanguage !== "JAPANESE") {
    redirect({ href: "/dashboard", locale });
  }
  await requireStudentOnboardingComplete(locale, user);
  return <FeatureMessages scope="japanesePlacement">{children}</FeatureMessages>;
}
