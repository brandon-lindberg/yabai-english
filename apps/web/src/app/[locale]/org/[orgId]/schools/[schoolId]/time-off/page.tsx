import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { SchoolTimeOffView } from "@/components/org/school-time-off-view";
import { requireSchoolViewer } from "@/lib/org/require-school-viewer";

export default async function SchoolTimeOffPage({
  params,
}: {
  params: Promise<{ orgId: string; schoolId: string }>;
}) {
  // The one school page teachers reach: they request time off, admins review it.
  const { orgId, schoolId, viewer } = await requireSchoolViewer(params, "adminOrTeacher");
  const t = await getTranslations("org.school.timeOffPage");

  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <SchoolTimeOffView
        orgId={orgId}
        schoolId={schoolId}
        canReview={viewer.isSchoolAdmin}
        canRequest={viewer.isSchoolTeacher}
      />
    </main>
  );
}
