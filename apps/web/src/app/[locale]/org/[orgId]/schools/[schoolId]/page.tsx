import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AppCard } from "@/components/ui/app-card";

export default async function SchoolDashboardPage({
  params,
}: {
  params: Promise<{ orgId: string; schoolId: string }>;
}) {
  const { orgId, schoolId } = await params;
  const session = await auth();
  const locale = await getLocale();

  if (!session?.user?.id) {
    redirect({ href: "/auth/signin", locale });
    return null;
  }

  const t = await getTranslations("org.school.dashboard");
  const { prisma } = await import("@/lib/prisma");

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true, name: true, organizationId: true,
      _count: {
        select: {
          memberships: { where: { status: "ACTIVE" } },
          scheduleSlots: { where: { active: true } },
          timeOffRequests: { where: { status: "PENDING" } },
        },
      },
    },
  });

  if (!school || school.organizationId !== orgId) {
    redirect({ href: `/org/${orgId}`, locale });
    return null;
  }

  const roleCounts = await prisma.organizationMembership.groupBy({
    by: ["orgRole"],
    where: { schoolId, status: "ACTIVE" },
    _count: true,
  });

  const teachers = roleCounts.find((r) => r.orgRole === "TEACHER")?._count ?? 0;
  const students = roleCounts.find((r) => r.orgRole === "STUDENT")?._count ?? 0;

  const stats = [
    { label: t("totalMembers"), value: school._count.memberships },
    { label: t("totalTeachers"), value: teachers },
    { label: t("totalStudents"), value: students },
    { label: t("activeSlots"), value: school._count.scheduleSlots },
    { label: t("pendingTimeOff"), value: school._count.timeOffRequests },
  ];

  return (
    <main>
      <PageHeader title={school.name} description={t("title")} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {stats.map((s) => (
          <AppCard key={s.label} padding="sm">
            <p className="text-xs font-medium text-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{s.value}</p>
          </AppCard>
        ))}
      </div>
    </main>
  );
}
