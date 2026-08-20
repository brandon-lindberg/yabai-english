import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { OrgSchoolsList } from "@/components/org/org-schools-list";
import { requireOrgViewer } from "@/lib/org/require-org-viewer";

export default async function OrgSchoolsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await requireOrgViewer(params);
  const t = await getTranslations("org.schoolsPage");

  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <OrgSchoolsList orgId={orgId} />
    </main>
  );
}
