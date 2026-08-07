import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { SchoolClassesView } from "@/components/org/school-classes-view";
import { requireSchoolViewer } from "@/lib/org/require-school-viewer";

export default async function SchoolClassesPage({
  params,
}: {
  params: Promise<{ orgId: string; schoolId: string }>;
}) {
  const { orgId, schoolId } = await requireSchoolViewer(params, "anyMember");
  const t = await getTranslations("org.school.classesPage");

  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <SchoolClassesView orgId={orgId} schoolId={schoolId} />
    </main>
  );
}
