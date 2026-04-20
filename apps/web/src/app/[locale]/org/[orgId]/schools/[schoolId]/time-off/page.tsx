import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { SchoolTimeOffView } from "@/components/org/school-time-off-view";

export default async function SchoolTimeOffPage({
  params,
}: {
  params: Promise<{ orgId: string; schoolId: string }>;
}) {
  const { orgId, schoolId } = await params;
  const t = await getTranslations("org.school.timeOffPage");

  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <SchoolTimeOffView orgId={orgId} schoolId={schoolId} />
    </main>
  );
}
