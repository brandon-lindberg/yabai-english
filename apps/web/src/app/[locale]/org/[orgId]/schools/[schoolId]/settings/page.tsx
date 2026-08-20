import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { SchoolSettingsForm } from "@/components/org/school-settings-form";
import { requireSchoolViewer } from "@/lib/org/require-school-viewer";

export default async function SchoolSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string; schoolId: string }>;
}) {
  const { orgId, schoolId } = await requireSchoolViewer(params, "schoolAdmin");
  const t = await getTranslations("org.school.settingsPage");

  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <SchoolSettingsForm orgId={orgId} schoolId={schoolId} />
    </main>
  );
}
