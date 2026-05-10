import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { TeacherRosterPanel } from "@/components/dashboard/teacher-roster-panel";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";

export default async function DashboardStudentsPage() {
  const session = await auth();
  const locale = await getLocale();
  if (!session?.user?.id || !isTeacherCabinetRole(session.user.role)) {
    redirect({ href: "/dashboard", locale });
  }

  const t = await getTranslations("dashboard.studentsPage");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("intro")}</p>
      </header>
      <TeacherRosterPanel />
    </div>
  );
}
