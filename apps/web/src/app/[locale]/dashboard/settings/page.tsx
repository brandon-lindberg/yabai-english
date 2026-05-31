import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";
import { GoogleIntegrationsSettingsContent } from "@/components/dashboard/google-integrations-settings-content";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { TeacherPaymentsSettings } from "@/components/settings/teacher-payments-settings";
import { StudentPaymentsSettings } from "@/components/settings/student-payments-settings";
import { TeacherTierSettings } from "@/components/settings/teacher-tier-settings";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";
import { resolveEffectiveTeacherTier } from "@/lib/platform-fees";

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
  const isTeacher = isTeacherCabinetRole(session.user.role);
  const isStudent = session.user.role === "STUDENT";
  const stripeConnectEnabled = Boolean(process.env.STRIPE_SECRET_KEY);
  const showTeacherPayments = isTeacher;
  const showStudentPayments = isStudent && stripeConnectEnabled;
  const activeTab =
    showTeacherPayments && tab === "tier"
      ? "tier"
      : (showTeacherPayments || showStudentPayments) && tab !== "google"
        ? "payments"
        : "google";
  const teacherProfile = showTeacherPayments
    ? await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
        select: {
          paymentPolicyAcceptedAt: true,
          tierState: true,
          tierEvaluations: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              kind: true,
              periodStart: true,
              periodEnd: true,
              averageLessons: true,
              recommendedTier: true,
              status: true,
            },
          },
          paymentAccounts: {
            select: {
              id: true,
              provider: true,
              providerAccountId: true,
              status: true,
              chargesEnabled: true,
              payoutsEnabled: true,
              requirementsDue: true,
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
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_BYPASS === "true" &&
    !stripeConnectEnabled;

  return (
    <div className="space-y-8">
      <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />
      <PageHeader title={t("title")} description={t("intro")} />
      <SettingsTabs
        activeTab={activeTab}
        showPayments={showTeacherPayments || showStudentPayments}
        showTier={showTeacherPayments}
      />
      {activeTab === "payments" && teacherProfile ? (
        <TeacherPaymentsSettings
          paymentPolicyAcceptedAt={teacherProfile.paymentPolicyAcceptedAt?.toISOString() ?? null}
          accounts={teacherProfile.paymentAccounts}
          devPaymentsEnabled={devPaymentsEnabled}
          stripeConnectEnabled={stripeConnectEnabled}
        />
      ) : null}
      {activeTab === "payments" && showStudentPayments ? (
        <StudentPaymentsSettings stripeConnectEnabled={stripeConnectEnabled} />
      ) : null}
      {activeTab === "tier" && teacherProfile ? (
        <TeacherTierSettings
          calculatedTier={teacherProfile.tierState?.calculatedTier ?? "TIER_1"}
          effectiveTier={
            resolveEffectiveTeacherTier(teacherProfile.tierState, new Date()).effectiveTier
          }
          source={
            resolveEffectiveTeacherTier(teacherProfile.tierState, new Date()).overrideActive
              ? "OVERRIDE"
              : "CALCULATED"
          }
          firstPaidLessonAt={teacherProfile.tierState?.firstPaidLessonAt?.toISOString() ?? null}
          nextQuarterlyReviewAt={teacherProfile.tierState?.nextQuarterlyReviewAt?.toISOString() ?? null}
          nextAnnualReviewAt={teacherProfile.tierState?.nextAnnualReviewAt?.toISOString() ?? null}
          overrideExpiresAt={teacherProfile.tierState?.overrideExpiresAt?.toISOString() ?? null}
          evaluations={teacherProfile.tierEvaluations.map((evaluation) => ({
            id: evaluation.id,
            kind: evaluation.kind,
            periodStart: evaluation.periodStart.toISOString(),
            periodEnd: evaluation.periodEnd.toISOString(),
            averageLessons: evaluation.averageLessons,
            recommendedTier: evaluation.recommendedTier,
            status: evaluation.status,
          }))}
        />
      ) : null}
      {activeTab === "google" ? (
        <GoogleIntegrationsSettingsContent searchParams={searchParams} />
      ) : null}
    </div>
  );
}
