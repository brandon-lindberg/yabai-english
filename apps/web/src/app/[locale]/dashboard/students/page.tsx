import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { TeacherRosterPanel } from "@/components/dashboard/teacher-roster-panel";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";
import { PageHeader } from "@/components/ui/page-header";

export default async function DashboardStudentsPage() {
  const session = await auth();
  const locale = await getLocale();
  if (!session?.user?.id || !isTeacherCabinetRole(session.user.role)) {
    redirect({ href: "/dashboard", locale });
  }

  const t = await getTranslations("dashboard.studentsPage");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("intro")} />
      <TeacherRosterPanel />
    </div>
  );
}
