import type { ReactNode } from "react";
import { redirect } from "@/i18n/navigation";
import { requireAuth, requireStudentOnboardingComplete } from "@/lib/onboarding-gate";
import { getLocale } from "next-intl/server";

export default async function PlacementLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();
  const user = await requireAuth(locale);
  if (user.role !== "STUDENT") {
    redirect({ href: "/dashboard", locale });
  }
  await requireStudentOnboardingComplete(locale, user);
  return children;
}
