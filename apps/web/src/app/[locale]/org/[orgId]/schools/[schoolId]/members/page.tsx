import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { SchoolMembersView } from "@/components/org/school-members-view";

export default async function SchoolMembersPage({
  params,
}: {
  params: Promise<{ orgId: string; schoolId: string }>;
}) {
  const { orgId, schoolId } = await params;
  const t = await getTranslations("org.school.membersPage");

  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <SchoolMembersView orgId={orgId} schoolId={schoolId} />
    </main>
  );
}
