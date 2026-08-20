import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { OrgSettingsForm } from "@/components/org/org-settings-form";
import { requireOrgViewer } from "@/lib/org/require-org-viewer";

export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await requireOrgViewer(params);
  const t = await getTranslations("org.settingsPage");

  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <OrgSettingsForm orgId={orgId} />
    </main>
  );
}
