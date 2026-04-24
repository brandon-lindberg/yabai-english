import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { SchoolClassesView } from "@/components/org/school-classes-view";
import { getViewerSchoolRole } from "@/lib/org-viewer-role";
import { prisma } from "@/lib/prisma";

export default async function SchoolClassesPage({
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

  const viewer = await getViewerSchoolRole(session.user.id, orgId, schoolId);
  if (!viewer) {
    redirect({ href: `/org/${orgId}`, locale });
    return null;
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { selfEnrollmentEnabled: true },
  });

  let studentMembershipId: string | null = null;
  if (viewer.isSchoolStudent) {
    const m = await prisma.organizationMembership.findFirst({
      where: {
        userId: session.user.id,
        organizationId: orgId,
        schoolId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    studentMembershipId = m?.id ?? null;
  }

  const t = await getTranslations("org.school.classesPage");
  const canSelfEnroll =
    viewer.isSchoolStudent &&
    (school?.selfEnrollmentEnabled ?? false) &&
    studentMembershipId !== null;

  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <SchoolClassesView
        orgId={orgId}
        schoolId={schoolId}
        canSelfEnroll={canSelfEnroll}
        studentMembershipId={studentMembershipId}
      />
    </main>
  );
}
