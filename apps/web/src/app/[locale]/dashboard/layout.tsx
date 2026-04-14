import type { ReactNode } from "react";
import { requireStudentOnboardingComplete } from "@/lib/onboarding-gate";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { DashboardSubNav } from "@/components/dashboard/dashboard-sub-nav";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const session = await auth();
  if (session?.user?.role === "STUDENT") {
    await requireStudentOnboardingComplete(locale);
  }
  const isStudent = session?.user?.role === "STUDENT";
  const isTeacher = session?.user?.role === "TEACHER";

  return (
    <main className="mx-auto max-w-4xl flex-1 px-4 py-6 sm:px-6">
      {isStudent || isTeacher ? <DashboardSubNav /> : null}
      {children}
    </main>
  );
}
