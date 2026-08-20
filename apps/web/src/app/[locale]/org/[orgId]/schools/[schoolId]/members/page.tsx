import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { SchoolMembersView } from "@/components/org/school-members-view";
import { requireSchoolViewer } from "@/lib/org/require-school-viewer";

export default async function SchoolMembersPage({
  params,
}: {
  params: Promise<{ orgId: string; schoolId: string }>;
}) {
  const { orgId, schoolId } = await requireSchoolViewer(params, "schoolAdmin");
  const t = await getTranslations("org.school.membersPage");

  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <SchoolMembersView orgId={orgId} schoolId={schoolId} />
    </main>
  );
}
