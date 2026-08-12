import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { AdminOrgDetail } from "@/components/admin/admin-org-detail";
import type { AdminOrganization } from "@/components/admin/admin-org-types";
import { countDistinctMembers } from "@/lib/org/member-identity";
import { PageHeader } from "@/components/ui/page-header";

/**
 * One organization, managed on its own page.
 *
 * Its schools, its members, and the forms that add to them used to be rendered
 * inline for every organization at once on `/admin/schools`. Clicking into the
 * thing you are about to change is the whole point.
 */
export default async function AdminOrgPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const t = await getTranslations("admin.schoolsPage");
  // Matches the rest of the admin tree, which the admin layout already gates.
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") return null;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      slug: true,
      name: true,
      timezone: true,
      schools: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          nameJa: true,
          nameEn: true,
          // Distinct people, not membership rows — see the note on the list page.
          memberships: {
            where: { status: "ACTIVE" },
            select: { userId: true, inviteEmail: true },
          },
        },
      },
      memberships: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          orgRole: true,
          schoolId: true,
          userId: true,
          inviteEmail: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!org) notFound();

  const data: AdminOrganization = {
    id: org.id,
    slug: org.slug,
    name: org.name,
    timezone: org.timezone,
    schoolCount: org.schools.length,
    memberCount: countDistinctMembers(org.memberships),
    schools: org.schools.map((school) => ({
      id: school.id,
      slug: school.slug,
      name: school.name,
      nameJa: school.nameJa,
      nameEn: school.nameEn,
      memberCount: countDistinctMembers(school.memberships),
    })),
    memberships: org.memberships.map((m) => ({
      id: m.id,
      orgRole: m.orgRole,
      schoolId: m.schoolId,
      userId: m.userId,
      inviteEmail: m.inviteEmail,
      user: m.user,
    })),
  };

  return (
    <main className="max-w-5xl">
      <p className="mb-4">
        <Link
          href="/admin/schools"
          className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          &larr; {t("backToOrgs")}
        </Link>
      </p>

      <PageHeader
        title={org.name}
        description={`${org.slug} · ${org.timezone} · ${t("schoolCount", {
          count: data.schoolCount,
        })} · ${t("memberCount", { count: data.memberCount })}`}
      />

      <AdminOrgDetail org={data} />
    </main>
  );
}
