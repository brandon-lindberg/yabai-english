import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AppCard } from "@/components/ui/app-card";
import { OrgInviteAccept } from "@/components/org/org-invite-accept";
import { prisma } from "@/lib/prisma";

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();
  const locale = await getLocale();

  const membership = await prisma.organizationMembership.findUnique({
    where: { inviteToken: token },
    select: {
      id: true,
      status: true,
      orgRole: true,
      inviteEmail: true,
      inviteExpiresAt: true,
      organization: { select: { id: true, name: true } },
      school: { select: { id: true, name: true } },
    },
  });

  const t = await getTranslations("org.invitePage");

  if (!membership) {
    return (
      <main className="mx-auto max-w-2xl">
        <PageHeader title={t("title")} />
        <AppCard>
          <p className="text-sm text-foreground">{t("invalid")}</p>
        </AppCard>
      </main>
    );
  }

  if (membership.status !== "INVITED") {
    return (
      <main className="mx-auto max-w-2xl">
        <PageHeader title={t("title")} />
        <AppCard>
          <p className="text-sm text-foreground">{t("alreadyUsed")}</p>
        </AppCard>
      </main>
    );
  }

  if (membership.inviteExpiresAt && membership.inviteExpiresAt < new Date()) {
    return (
      <main className="mx-auto max-w-2xl">
        <PageHeader title={t("title")} />
        <AppCard>
          <p className="text-sm text-foreground">{t("expired")}</p>
        </AppCard>
      </main>
    );
  }

  if (!session?.user?.id) {
    redirect({
      href: `/auth/signin?callbackUrl=${encodeURIComponent(
        `/${locale}/org/invite/${token}`,
      )}`,
      locale,
    });
    return null;
  }

  return (
    <main className="mx-auto max-w-2xl">
      <PageHeader
        title={t("title")}
        description={t("description", { org: membership.organization.name })}
      />
      <OrgInviteAccept
        token={token}
        orgName={membership.organization.name}
        schoolName={membership.school?.name ?? null}
        orgRole={membership.orgRole}
        orgId={membership.organization.id}
      />
    </main>
  );
}
