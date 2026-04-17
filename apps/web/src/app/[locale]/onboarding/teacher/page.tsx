import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAuth } from "@/lib/onboarding-gate";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { TeacherOnboardingForm } from "@/components/teacher-onboarding-form";

export default async function TeacherOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ completed?: string }>;
}) {
  const locale = await getLocale();
  const t = await getTranslations("onboarding");
  const user = await requireAuth(locale);
  const { completed } = await searchParams;

  if (user.role !== "TEACHER") {
    redirect({ href: "/dashboard", locale });
  }

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: user.id },
    select: { onboardingCompletedAt: true, skippedOnboardingSteps: true },
  });
  if (profile?.onboardingCompletedAt) {
    redirect({ href: "/dashboard", locale });
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <PageHeader title={t("teacherTitle")} description={t("teacherSubtitle")} />
      <div className="mt-8">
        <TeacherOnboardingForm
          completedParam={completed ?? null}
          skippedSteps={profile?.skippedOnboardingSteps ?? []}
        />
      </div>
    </main>
  );
}
