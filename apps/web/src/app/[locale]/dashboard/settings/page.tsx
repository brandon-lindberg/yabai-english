import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";
import { GoogleIntegrationsSettingsContent } from "@/components/dashboard/google-integrations-settings-content";
import { TeacherPaymentPolicyForm } from "@/components/teacher-payment-policy-form";

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    onboardingNext?: string;
    onboardingStep?: string;
    google?: string;
    feature?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const t = await getTranslations("dashboard.settingsPage");
  const { onboardingNext, onboardingStep } = await searchParams;
  const onboardingHref = normalizeOnboardingNextHref(onboardingNext ?? null);
  const teacherProfile = session.user.role === "TEACHER"
    ? await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
        select: { paymentPolicyAcceptedAt: true },
      })
    : null;

  return (
    <div className="space-y-8">
      <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />
      <PageHeader title={t("title")} description={t("intro")} />
      {session.user.role === "TEACHER" ? (
        <TeacherPaymentPolicyForm
          acceptedAt={teacherProfile?.paymentPolicyAcceptedAt?.toISOString() ?? null}
        />
      ) : null}
      <GoogleIntegrationsSettingsContent searchParams={searchParams} />
    </div>
  );
}
