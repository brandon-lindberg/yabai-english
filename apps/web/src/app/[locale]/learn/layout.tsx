import type { ReactNode } from "react";
import { requireRoleOnboardingComplete } from "@/lib/onboarding-gate";
import { getLocale } from "next-intl/server";

export default async function LearnLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  await requireRoleOnboardingComplete(locale);
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
      {children}
    </div>
  );
}
