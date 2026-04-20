import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { SchoolSettingsForm } from "@/components/org/school-settings-form";

export default async function SchoolSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string; schoolId: string }>;
}) {
  const { orgId, schoolId } = await params;
  const t = await getTranslations("org.school.settingsPage");

  return (
    <main>
      <PageHeader title={t("title")} />
      <SchoolSettingsForm orgId={orgId} schoolId={schoolId} />
    </main>
  );
}
