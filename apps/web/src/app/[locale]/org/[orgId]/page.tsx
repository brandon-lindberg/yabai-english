import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AppCard } from "@/components/ui/app-card";
import { Link } from "@/i18n/navigation";
import { isOrgWideRole } from "@/lib/org-authorization";

async function fetchOrg(orgId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { prisma } = await import("@/lib/prisma");

  const caller = await prisma.organizationMembership.findFirst({
    where: { userId: session.user.id, organizationId: orgId, status: "ACTIVE" },
    select: { orgRole: true, schoolId: true },
  });
  if (!caller) return null;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      schools: {
        select: {
          id: true, slug: true, name: true, nameJa: true,
          _count: {
            select: {
              memberships: { where: { status: "ACTIVE" } },
              scheduleSlots: { where: { active: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: { memberships: { where: { status: "ACTIVE" } } },
      },
    },
  });

  if (!org) return null;

  // Count by role
  const roleCounts = await prisma.organizationMembership.groupBy({
    by: ["orgRole"],
    where: { organizationId: orgId, status: "ACTIVE" },
    _count: true,
  });

  const teachers = roleCounts.find((r) => r.orgRole === "TEACHER")?._count ?? 0;
  const students = roleCounts.find((r) => r.orgRole === "STUDENT")?._count ?? 0;

  return { org, caller, teachers, students };
}

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const locale = await getLocale();
  const t = await getTranslations("org.dashboard");
  const data = await fetchOrg(orgId);

  if (!data) {
    redirect({ href: "/dashboard", locale });
    return null;
  }

  const { org, caller, teachers, students } = data;
  const canManageOrg = isOrgWideRole(caller.orgRole);
  const singleSchool = org.schools.length === 1 ? org.schools[0] : null;

  const stats = [
    { label: t("totalSchools"), value: org.schools.length },
    { label: t("totalMembers"), value: org._count.memberships },
    { label: t("totalTeachers"), value: teachers },
    { label: t("totalStudents"), value: students },
  ];

  const schoolQuickLinks = (schoolId: string) => [
    { href: `/org/${orgId}/schools/${schoolId}/schedule`, label: t("quickSchedule") },
    { href: `/org/${orgId}/schools/${schoolId}/classes`, label: t("quickClasses") },
    { href: `/org/${orgId}/schools/${schoolId}/members`, label: t("quickMembers") },
    { href: `/org/${orgId}/schools/${schoolId}/pricing`, label: t("quickPricing") },
  ];

  return (
    <main>
      <PageHeader title={org.name} description={t("title")} />

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <AppCard key={s.label} padding="sm">
            <p className="text-xs font-medium text-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{s.value}</p>
          </AppCard>
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {t("schoolsOverview")}
          </h2>
          {canManageOrg && (
            <Link
              href={`/org/${orgId}/schools`}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {t("addSchool")}
            </Link>
          )}
        </div>
        {org.schools.length === 0 ? (
          <p className="text-sm text-muted">{t("noActivity")}</p>
        ) : singleSchool ? (
          <AppCard padding="sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{singleSchool.name}</p>
                <p className="text-xs text-muted">
                  {t("membersCount", { count: singleSchool._count.memberships })}
                </p>
              </div>
              <Link
                href={`/org/${orgId}/schools/${singleSchool.id}`}
                className="rounded-full border border-border px-3 py-1 text-sm font-medium text-foreground hover:bg-[var(--app-hover)]"
              >
                {t("viewSchool")}
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {schoolQuickLinks(singleSchool.id).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted hover:bg-[var(--app-hover)] hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </AppCard>
        ) : (
          <div className="space-y-3">
            {org.schools.map((school) => (
              <AppCard key={school.id} padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{school.name}</p>
                    <p className="text-xs text-muted">
                      {t("membersCount", { count: school._count.memberships })}
                    </p>
                  </div>
                  <Link
                    href={`/org/${orgId}/schools/${school.id}`}
                    className="rounded-full border border-border px-3 py-1 text-sm font-medium text-foreground hover:bg-[var(--app-hover)]"
                  >
                    {t("viewSchool")}
                  </Link>
                </div>
              </AppCard>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
