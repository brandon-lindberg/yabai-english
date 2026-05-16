import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";
import { GoogleIntegrationsSettingsContent } from "@/components/dashboard/google-integrations-settings-content";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { TeacherPaymentsSettings } from "@/components/settings/teacher-payments-settings";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    onboardingNext?: string;
    onboardingStep?: string;
    google?: string;
    feature?: string;
    tab?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const t = await getTranslations("dashboard.settingsPage");
  const { onboardingNext, onboardingStep, tab } = await searchParams;
  const onboardingHref = normalizeOnboardingNextHref(onboardingNext ?? null);
  const showPayments = isTeacherCabinetRole(session.user.role);
  const activeTab = showPayments && tab !== "google" ? "payments" : "google";
  const teacherProfile = showPayments
    ? await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
        select: {
          paymentPolicyAcceptedAt: true,
          paymentAccounts: {
            select: {
              id: true,
              provider: true,
              providerAccountId: true,
              status: true,
              chargesEnabled: true,
              payoutsEnabled: true,
              methods: {
                select: {
                  method: true,
                  enabled: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      })
    : null;
  const devPaymentsEnabled =
    process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true";
  const stripeConnectEnabled = Boolean(process.env.STRIPE_SECRET_KEY);

  return (
    <div className="space-y-8">
      <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />
      <PageHeader title={t("title")} description={t("intro")} />
      <SettingsTabs activeTab={activeTab} showPayments={showPayments} />
      {activeTab === "payments" && teacherProfile ? (
        <TeacherPaymentsSettings
          paymentPolicyAcceptedAt={teacherProfile.paymentPolicyAcceptedAt?.toISOString() ?? null}
          accounts={teacherProfile.paymentAccounts}
          devPaymentsEnabled={devPaymentsEnabled}
          stripeConnectEnabled={stripeConnectEnabled}
        />
      ) : null}
      {activeTab === "google" ? (
        <GoogleIntegrationsSettingsContent searchParams={searchParams} />
      ) : null}
    </div>
  );
}
