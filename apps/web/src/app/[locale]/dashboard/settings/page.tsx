import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";
import { GoogleIntegrationsSettingsContent } from "@/components/dashboard/google-integrations-settings-content";

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

  return (
    <div className="space-y-8">
      <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />
      <PageHeader title={t("title")} description={t("intro")} />
      <GoogleIntegrationsSettingsContent searchParams={searchParams} />
    </div>
  );
}
