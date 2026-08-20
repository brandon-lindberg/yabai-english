import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminOrgList } from "@/components/admin/admin-org-list";
import {
  ACTIVE_MEMBERS_FILTER,
  ORG_MEMBER_SELECT,
  summarizeOrgMembers,
} from "@/lib/org/org-members";
import type { AdminOrganizationSummary } from "@/components/admin/admin-org-types";
import { PageHeader } from "@/components/ui/page-header";

/**
 * Every organization, as a list.
 *
 * This query used to pull every school and every membership of every
 * organization, because the page rendered all of them inline. A list needs
 * counts; the organization's own page loads the rest.
 */
export default async function AdminSchoolsPage() {
  const t = await getTranslations("admin.schoolsPage");
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") return null;

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      timezone: true,
      _count: { select: { schools: true } },
      // People, not grants — the one definition lives in `lib/org/org-members`.
      memberships: { where: ACTIVE_MEMBERS_FILTER, select: ORG_MEMBER_SELECT },
    },
  });

  const rows: AdminOrganizationSummary[] = organizations.map((org) => ({
    id: org.id,
    slug: org.slug,
    name: org.name,
    timezone: org.timezone,
    schoolCount: org._count.schools,
    memberCount: summarizeOrgMembers(org.memberships).members,
  }));

  return (
    <main className="max-w-5xl">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <AdminOrgList organizations={rows} />
    </main>
  );
}
