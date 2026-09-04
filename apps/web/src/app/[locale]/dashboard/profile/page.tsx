import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardProfileForm } from "@/components/dashboard/dashboard-profile-form";
import { TeacherProfileForm } from "@/components/dashboard/teacher-profile-form";
import { resolveDisplayNameForForm } from "@/lib/profile-prefill";
import { buildTeacherOnboardingReturnFromProfile } from "@/lib/teacher-onboarding-progress";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";
import { PageHeader } from "@/components/ui/page-header";

export default async function DashboardProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ onboardingNext?: string; onboardingStep?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { onboardingNext: onboardingNextParam, onboardingStep: onboardingStepParam } =
    await searchParams;
  if (isTeacherCabinetRole(session.user.role)) {
    const onboardingNext = onboardingNextParam ?? null;
    const t = await getTranslations("dashboard.profilePage");
    const [profile, user] = await Promise.all([
      prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
        select: {
          id: true,
          onboardingCompletedAt: true,
          displayName: true,
          bio: true,
          countryOfOrigin: true,
          credentials: true,
          instructionLanguages: true,
          specialties: true,
          marketplaceHidden: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, image: true },
      }),
    ]);

    const { initial: displayInitial, showPrefillHint } = resolveDisplayNameForForm({
      profileDisplayName: profile?.displayName,
      userName: user?.name,
      userEmail: user?.email,
    });
    const postSaveRedirect = buildTeacherOnboardingReturnFromProfile(
      profile?.onboardingCompletedAt,
      null,
    );

    return (
      <div className="space-y-6">
        <OnboardingResumeBanner
          href={onboardingNext}
          step={onboardingStepParam ?? null}
        />
        <PageHeader title={t("teacherTitle")} description={t("teacherIntro")} />
        <TeacherProfileForm
          showGooglePrefillHint={showPrefillHint}
          avatarUrl={user?.image ?? null}
          initialTeacherProfileId={profile?.id ?? null}
          initialDisplayName={displayInitial === "" ? null : displayInitial}
          initialBio={profile?.bio ?? null}
          initialCountryOfOrigin={profile?.countryOfOrigin ?? null}
          initialCredentials={profile?.credentials ?? null}
          initialInstructionLanguages={profile?.instructionLanguages ?? ["EN"]}
          initialSpecialties={profile?.specialties ?? []}
          initialMarketplaceHidden={profile?.marketplaceHidden ?? false}
          postSaveRedirect={onboardingNext ?? postSaveRedirect}
        />
      </div>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      // Goals and level are what a teacher reads alongside the introduction.
      studentProfile: {
        select: {
          shortBio: true,
          learningGoals: true,
          learningGoalsNote: true,
          placedLevel: true,
        },
      },
    },
  });

  const t = await getTranslations("dashboard.profilePage");

  const { initial: nameInitial, showPrefillHint } = resolveDisplayNameForForm({
    profileDisplayName: user?.name,
    userName: user?.name,
    userEmail: user?.email,
  });

  return (
    <div className="space-y-6">
      <OnboardingResumeBanner
        href={onboardingNextParam ?? null}
        step={onboardingStepParam ?? null}
      />
      <PageHeader title={t("title")} description={t("intro")} />
      <DashboardProfileForm
        showGooglePrefillHint={showPrefillHint}
        initialName={nameInitial === "" ? null : nameInitial}
        initialShortBio={user?.studentProfile?.shortBio ?? null}
        initialLearningGoals={user?.studentProfile?.learningGoals ?? []}
        initialLearningGoalsNote={user?.studentProfile?.learningGoalsNote ?? null}
        placedLevel={user?.studentProfile?.placedLevel ?? null}
        avatarUrl={user?.image ?? null}
        postSaveRedirect={onboardingNextParam ?? null}
      />
    </div>
  );
}
