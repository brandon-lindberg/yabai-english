import type { ReactNode } from "react";
import { requireStudentOnboardingComplete } from "@/lib/onboarding-gate";
import { getLocale } from "next-intl/server";

export default async function LearnLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  await requireStudentOnboardingComplete(locale);
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
      {children}
    </div>
  );
}
