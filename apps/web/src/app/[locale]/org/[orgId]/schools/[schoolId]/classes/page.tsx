import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { SchoolClassesView } from "@/components/org/school-classes-view";

export default async function SchoolClassesPage({
  params,
}: {
  params: Promise<{ orgId: string; schoolId: string }>;
}) {
  const { orgId, schoolId } = await params;
  const t = await getTranslations("org.school.classesPage");

  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <SchoolClassesView orgId={orgId} schoolId={schoolId} />
    </main>
  );
}
