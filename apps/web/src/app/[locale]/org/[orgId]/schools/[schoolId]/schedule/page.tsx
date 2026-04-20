import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { SchoolScheduleView } from "@/components/org/school-schedule-view";

export default async function SchoolSchedulePage({
  params,
}: {
  params: Promise<{ orgId: string; schoolId: string }>;
}) {
  const { orgId, schoolId } = await params;
  const t = await getTranslations("org.school.schedulePage");

  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <SchoolScheduleView orgId={orgId} schoolId={schoolId} />
    </main>
  );
}
