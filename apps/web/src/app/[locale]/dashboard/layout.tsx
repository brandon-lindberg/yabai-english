import { requireLearningSiteForPage } from "@/lib/learning-site-page";
import type { ReactNode } from "react";
import { requireStudentOnboardingComplete } from "@/lib/onboarding-gate";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { DashboardSubNav } from "@/components/dashboard/dashboard-sub-nav";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const session = await auth();
  // Teachers must be able to open their profile, settings and schedule while
  // setting up. Their initial gate belongs to the dashboard entry page.
  if (session?.user?.role === "STUDENT") {
    await requireLearningSiteForPage("/dashboard", session.user.learningLanguage);
    await requireStudentOnboardingComplete(locale, session.user);
  }
  const isStudent = session?.user?.role === "STUDENT";
  const showTeacherTabs = isTeacherCabinetRole(session?.user?.role);

  return (
    <main className="mx-auto max-w-4xl flex-1 px-4 py-6 sm:px-6">
      {isStudent || showTeacherTabs ? (
        <DashboardSubNav isTeacher={showTeacherTabs} isStudent={isStudent} />
      ) : null}
      {children}
    </main>
  );
}
