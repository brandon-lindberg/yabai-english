import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminSchoolsView, type AdminOrganization } from "@/components/admin/admin-schools-view";
import { PageHeader } from "@/components/ui/page-header";

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
      nameJa: true,
      nameEn: true,
      timezone: true,
      billingTarget: true,
      createdAt: true,
      schools: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          nameJa: true,
          nameEn: true,
          _count: {
            select: { memberships: { where: { status: "ACTIVE" } } },
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
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  const serializable: AdminOrganization[] = organizations.map((org) => ({
    id: org.id,
    slug: org.slug,
    name: org.name,
    nameJa: org.nameJa,
    nameEn: org.nameEn,
    timezone: org.timezone,
    billingTarget: org.billingTarget,
    createdAt: org.createdAt.toISOString(),
    schools: org.schools.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      nameJa: s.nameJa,
      nameEn: s.nameEn,
      memberCount: s._count.memberships,
    })),
    memberships: org.memberships.map((m) => ({
      id: m.id,
      orgRole: m.orgRole,
      schoolId: m.schoolId,
      user: m.user,
    })),
  }));

  return (
    <main className="max-w-5xl">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <AdminSchoolsView initialOrganizations={serializable} />
    </main>
  );
}
