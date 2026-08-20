import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { StatLedger } from "@/components/ui/stat-ledger";
import { requireSchoolViewer } from "@/lib/org/require-school-viewer";
import { countOrgMembers } from "@/lib/org/org-members";

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

  /*
    Includes the organization's own people: an org-wide grant has no `schoolId`
    and covers every school. Counting only school-scoped rows is why this page
    said "1 member" while the organization above it said "2".
  */
  const memberCounts = await countOrgMembers(prisma, orgId, schoolId);

  return (
    <main>
      <PageHeader title={school.name} description={t("title")} />
      {/* Was five equal AppCards with the label above the number — the
          hero-metric grid the redesign replaced everywhere else and missed
          here. Same ledger the teacher and student dashboards use. */}
      <StatLedger
        stats={[
          { label: t("totalMembers"), value: memberCounts.members },
          { label: t("totalTeachers"), value: memberCounts.teachers },
          { label: t("totalStudents"), value: memberCounts.students },
          { label: t("activeSlots"), value: school._count.scheduleSlots },
          { label: t("pendingTimeOff"), value: school._count.timeOffRequests },
        ]}
      />
    </main>
  );
}
