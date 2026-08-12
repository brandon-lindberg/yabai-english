import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminOrgList } from "@/components/admin/admin-org-list";
import { countDistinctMembers } from "@/lib/org/member-identity";
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
      /*
        Not `_count` on memberships: that counts *grants*, and one person
        commonly holds two in the same organization (org-wide OWNER plus
        SCHOOL_ADMIN of one of its schools). An org with one person in it
        reported "2 members".
      */
      memberships: {
        where: { status: "ACTIVE" },
        select: { userId: true, inviteEmail: true },
      },
    },
  });

  const rows: AdminOrganizationSummary[] = organizations.map((org) => ({
    id: org.id,
    slug: org.slug,
    name: org.name,
    timezone: org.timezone,
    schoolCount: org._count.schools,
    memberCount: countDistinctMembers(org.memberships),
  }));

  return (
    <main className="max-w-5xl">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <AdminOrgList organizations={rows} />
    </main>
  );
}
