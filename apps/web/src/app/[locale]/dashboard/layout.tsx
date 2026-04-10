import type { ReactNode } from "react";
import { requireStudentOnboardingComplete } from "@/lib/onboarding-gate";
import { getLocale } from "next-intl/server";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();
  await requireStudentOnboardingComplete(locale);
  return children;
}
