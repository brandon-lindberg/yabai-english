import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { TeacherTaxonomyManager } from "@/components/dashboard/teacher-taxonomy-manager";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";

export default async function DashboardTaxonomyPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const locale = await getLocale();
  if (!isTeacherCabinetRole(session.user.role)) {
    redirect({ href: "/dashboard", locale });
  }

  const t = await getTranslations("dashboard.taxonomyPage");
  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <TeacherTaxonomyManager />
    </main>
  );
}
