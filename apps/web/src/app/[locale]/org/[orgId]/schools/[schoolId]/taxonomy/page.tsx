import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { SchoolTaxonomyManager } from "@/components/org/school-taxonomy-manager";
import { requireSchoolViewer } from "@/lib/org/require-school-viewer";

export default async function SchoolTaxonomyPage({
  params,
}: {
  params: Promise<{ orgId: string; schoolId: string }>;
}) {
  const { orgId, schoolId } = await requireSchoolViewer(params, "schoolAdmin");
  const t = await getTranslations("org.school.taxonomyPage");

  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <SchoolTaxonomyManager orgId={orgId} schoolId={schoolId} />
    </main>
  );
}
