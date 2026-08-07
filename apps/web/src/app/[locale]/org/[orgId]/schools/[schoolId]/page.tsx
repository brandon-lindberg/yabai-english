import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { StatLedger } from "@/components/ui/stat-ledger";
import { requireSchoolViewer } from "@/lib/org/require-school-viewer";

export default async function SchoolDashboardPage({
  params,
}: {
  params: Promise<{ orgId: string; schoolId: string }>;
}) {
  const { orgId, schoolId } = await requireSchoolViewer(params, "anyMember");
  const locale = await getLocale();
  const t = await getTranslations("org.school.dashboard");

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      organizationId: true,
      _count: {
        select: {
          memberships: { where: { status: "ACTIVE" } },
          scheduleSlots: { where: { active: true } },
          timeOffRequests: { where: { status: "PENDING" } },
        },
      },
    },
  });

  // The viewer's membership covers this school; this checks the school is in
  // the org named by the URL, which is a different claim.
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

  return (
    <main>
      <PageHeader title={school.name} description={t("title")} />
      {/* Was five equal AppCards with the label above the number — the
          hero-metric grid the redesign replaced everywhere else and missed
          here. Same ledger the teacher and student dashboards use. */}
      <StatLedger
        stats={[
          { label: t("totalMembers"), value: school._count.memberships },
          { label: t("totalTeachers"), value: teachers },
          { label: t("totalStudents"), value: students },
          { label: t("activeSlots"), value: school._count.scheduleSlots },
          { label: t("pendingTimeOff"), value: school._count.timeOffRequests },
        ]}
      />
    </main>
  );
}
