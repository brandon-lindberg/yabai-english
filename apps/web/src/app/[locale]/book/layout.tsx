import type { ReactNode } from "react";
import { requireRoleOnboardingComplete } from "@/lib/onboarding-gate";
import { getLocale } from "next-intl/server";

export default async function BookLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  await requireRoleOnboardingComplete(locale);
  return children;
}
