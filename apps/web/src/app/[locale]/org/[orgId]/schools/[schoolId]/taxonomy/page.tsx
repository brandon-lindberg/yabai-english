import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { SchoolTaxonomyManager } from "@/components/org/school-taxonomy-manager";
import { getViewerSchoolRole } from "@/lib/org-viewer-role";

export default async function SchoolTaxonomyPage({
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
  if (!viewer?.isSchoolAdmin) {
    redirect({ href: `/org/${orgId}/schools/${schoolId}`, locale });
    return null;
  }

  const t = await getTranslations("org.school.taxonomyPage");

  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <SchoolTaxonomyManager orgId={orgId} schoolId={schoolId} />
    </main>
  );
}
