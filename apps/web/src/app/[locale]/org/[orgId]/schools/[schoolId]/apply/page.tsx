import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AppCard } from "@/components/ui/app-card";
import { SchoolApplyForm } from "@/components/org/school-apply-form";
import { prisma } from "@/lib/prisma";

export default async function SchoolApplyPage({
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

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      organizationId: true,
      applicationFlowEnabled: true,
      organization: { select: { name: true } },
    },
  });

  if (!school || school.organizationId !== orgId) {
    redirect({ href: "/dashboard", locale });
    return null;
  }

  const existing = await prisma.organizationMembership.findFirst({
    where: { userId: session.user.id, organizationId: orgId, schoolId },
    select: { status: true },
  });

  const t = await getTranslations("org.school.applyPage");

  return (
    <main className="mx-auto max-w-2xl">
      <PageHeader
        title={t("title", { school: school.name })}
        description={t("description", { org: school.organization.name })}
      />
      {!school.applicationFlowEnabled ? (
        <AppCard>
          <p className="text-sm text-muted">{t("notEnabled")}</p>
        </AppCard>
      ) : existing?.status === "ACTIVE" ? (
        <AppCard>
          <p className="text-sm text-foreground">{t("alreadyMember")}</p>
        </AppCard>
      ) : existing?.status === "PENDING_APPROVAL" ? (
        <AppCard>
          <p className="text-sm text-foreground">{t("pending")}</p>
        </AppCard>
      ) : (
        <SchoolApplyForm orgId={orgId} schoolId={schoolId} />
      )}
    </main>
  );
}
