import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { DashboardProfileForm } from "@/components/dashboard/dashboard-profile-form";
import { TeacherProfileForm } from "@/components/dashboard/teacher-profile-form";
import { resolveDisplayNameForForm } from "@/lib/profile-prefill";
import { buildTeacherOnboardingReturnFromProfile } from "@/lib/teacher-onboarding-progress";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";

export default async function DashboardProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ onboardingNext?: string; onboardingStep?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const locale = await getLocale();
  const { onboardingNext: onboardingNextParam, onboardingStep: onboardingStepParam } =
    await searchParams;
  if (session.user.role === "ADMIN") {
    redirect({ href: "/dashboard", locale });
  }

  if (session.user.role === "TEACHER") {
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
          rateYen: true,
          offersFreeTrial: true,
          lessonOfferings: {
            where: { active: true },
            orderBy: [{ isGroup: "asc" }, { durationMin: "asc" }],
            select: {
              id: true,
              durationMin: true,
              rateYen: true,
              isGroup: true,
              groupSize: true,
              lessonType: true,
              lessonTypeCustom: true,
            },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true },
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
        <header>
          <h1 className="text-2xl font-bold text-foreground">{t("teacherTitle")}</h1>
          <p className="mt-2 text-muted">{t("teacherIntro")}</p>
        </header>
        <TeacherProfileForm
          showGooglePrefillHint={showPrefillHint}
          initialTeacherProfileId={profile?.id ?? null}
          initialDisplayName={displayInitial === "" ? null : displayInitial}
          initialBio={profile?.bio ?? null}
          initialCountryOfOrigin={profile?.countryOfOrigin ?? null}
          initialCredentials={profile?.credentials ?? null}
          initialInstructionLanguages={profile?.instructionLanguages ?? ["EN"]}
          initialSpecialties={profile?.specialties ?? []}
          initialRateYen={profile?.rateYen ?? null}
          initialOffersFreeTrial={profile?.offersFreeTrial ?? true}
          postSaveRedirect={onboardingNext ?? postSaveRedirect}
          initialLessonOfferings={profile?.lessonOfferings ?? []}
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
      studentProfile: { select: { shortBio: true } },
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
      <header>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("intro")}</p>
      </header>
      <DashboardProfileForm
        showGooglePrefillHint={showPrefillHint}
        initialName={nameInitial === "" ? null : nameInitial}
        initialShortBio={user?.studentProfile?.shortBio ?? null}
        avatarUrl={user?.image ?? null}
        postSaveRedirect={onboardingNextParam ?? null}
      />
    </div>
  );
}
