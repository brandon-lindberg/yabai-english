import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { SchoolClassesView } from "@/components/org/school-classes-view";
import { getViewerSchoolRole } from "@/lib/org-viewer-role";

export default async function SchoolClassesPage({
  params,
}: {
  params: Promise<{ orgId: string; schoolId: string }>;
}) {
  const { orgId, schoolId } = await params;
  const session = await auth();
  const locale = await getLocale();

  if (!session?.user?.id) {
    redirect({ href: "/auth/signin", locale });
    return null;
  }

  const viewer = await getViewerSchoolRole(session.user.id, orgId, schoolId);
  if (!viewer) {
    redirect({ href: `/org/${orgId}`, locale });
    return null;
  }

  const t = await getTranslations("org.school.classesPage");

  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <SchoolClassesView orgId={orgId} schoolId={schoolId} />
    </main>
  );
}
