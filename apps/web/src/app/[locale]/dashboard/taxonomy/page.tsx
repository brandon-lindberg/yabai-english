import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { TeacherTaxonomyManager } from "@/components/dashboard/teacher-taxonomy-manager";

export default async function DashboardTaxonomyPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const locale = await getLocale();
  if (session.user.role !== "TEACHER") {
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
