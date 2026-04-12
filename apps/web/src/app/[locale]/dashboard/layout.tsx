import type { ReactNode } from "react";
import { requireStudentOnboardingComplete } from "@/lib/onboarding-gate";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { DashboardSubNav } from "@/components/dashboard/dashboard-sub-nav";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  await requireStudentOnboardingComplete(locale);
  const session = await auth();
  const isStudent = session?.user?.role === "STUDENT";

  return (
    <main className="mx-auto max-w-4xl flex-1 px-4 py-6 sm:px-6">
      {isStudent ? <DashboardSubNav /> : null}
      {children}
    </main>
  );
}
