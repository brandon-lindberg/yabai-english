import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { SchoolScheduleCalendar } from "@/components/org/school-schedule-calendar";
import { requireSchoolViewer } from "@/lib/org/require-school-viewer";

export default async function SchoolSchedulePage({
  params,
}: {
  params: Promise<{ orgId: string; schoolId: string }>;
}) {
  const { orgId, schoolId } = await requireSchoolViewer(params, "schoolAdmin");
  const t = await getTranslations("org.school.schedulePage");

  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <SchoolScheduleCalendar orgId={orgId} schoolId={schoolId} />
    </main>
  );
}
