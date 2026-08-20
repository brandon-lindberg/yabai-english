import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { OrgMembersList } from "@/components/org/org-members-list";
import { requireOrgViewer } from "@/lib/org/require-org-viewer";

export default async function OrgMembersPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await requireOrgViewer(params);
  const t = await getTranslations("org.membersPage");

  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <OrgMembersList orgId={orgId} />
    </main>
  );
}
