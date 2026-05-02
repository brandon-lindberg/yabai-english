import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { OrgMembersList } from "@/components/org/org-members-list";

export default async function OrgMembersPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const session = await auth();
  const locale = await getLocale();

  if (!session?.user?.id) {
    redirect({ href: "/auth/signin", locale });
    return null;
  }

  const t = await getTranslations("org.membersPage");

  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <OrgMembersList orgId={orgId} />
    </main>
  );
}
