import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { TeacherCard } from "@/components/teacher-card";
import { TeacherFilterBar } from "@/components/teacher-filter-bar";
import { filterTeacherCards } from "@/lib/teacher-discovery";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/i18n/navigation";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";
import { appPathForLocale } from "@/lib/i18n-app-path";
import { authSignInHref } from "@/lib/auth-sign-in-href";
import { resolveSafeCallbackUrl } from "@/lib/auth-callback-url";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "booking" });
  return {
    title: t("title"),
    description: t("teacherBrowseSubtitle"),
  };
}

type Props = {
  searchParams: Promise<{
    specialty?: string;
    language?: string;
    onboardingNext?: string;
    onboardingStep?: string;
  }>;
};

export default async function BookPage({ searchParams }: Props) {
  const t = await getTranslations("booking");
  const params = await searchParams;
  const session = await auth();
  const locale = await getLocale();
  if (session?.user?.role && session.user.role !== "STUDENT") {
    redirect({ href: "/dashboard", locale });
  }

  const guest = !session?.user;
  const onboardingHref = normalizeOnboardingNextHref(params.onboardingNext ?? null);
  let specialty = params.specialty?.trim() ?? "";
  let language = params.language?.trim().toUpperCase() ?? "";

  if (guest && (specialty || language)) {
    const sp = new URLSearchParams();
    if (specialty) sp.set("specialty", specialty);
    if (language) sp.set("language", language);
    const callbackPath = appPathForLocale(locale, "/book", sp);
    redirect({
      href: authSignInHref(callbackPath, "/book") as "/auth/signin",
      locale,
    });
  }

  if (guest) {
    specialty = "";
    language = "";
  }

  const teacherProfiles = await prisma.teacherProfile.findMany({
    where:
      session?.user?.id && session.user.role === "STUDENT"
        ? {
            user: {
              chatThreadsAsTeacher: {
                none: {
                  studentId: session.user.id,
                  teacherBlockedAt: { not: null },
                },
              },
            },
          }
        : undefined,
    include: {
      user: true,
      availabilitySlots: {
        where: { active: true },
      },
    },
    orderBy: { userId: "asc" },
  });

  const cards = teacherProfiles.map((teacher) => ({
    id: teacher.id,
    displayName: teacher.displayName ?? teacher.user.name ?? "Teacher",
    imageUrl: teacher.user.image,
    countryOfOrigin: teacher.countryOfOrigin,
    specialties: teacher.specialties,
    instructionLanguages: teacher.instructionLanguages,
    rateYen: teacher.rateYen,
    activeAvailabilityCount: teacher.availabilitySlots.length,
  }));

  const filtered = filterTeacherCards(cards, { specialty, language });
  const bookHomeCallback = resolveSafeCallbackUrl(appPathForLocale(locale, "/book"), "/book");

  return (
    <main className="mx-auto max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <OnboardingResumeBanner href={onboardingHref} step={params.onboardingStep ?? null} />
      <PageHeader title={t("title")} description={t("teacherBrowseSubtitle")} />
      <div className="mt-6">
        <TeacherFilterBar specialty={specialty} language={language} guestLocked={guest} />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="sm:col-span-2">
            <EmptyState
              title={t("noTeachersFound")}
              description={t("teacherBrowseSubtitle")}
              action={
                guest ? (
                  <Link
                    href={{
                      pathname: "/auth/signin",
                      query: { callbackUrl: bookHomeCallback },
                    }}
                    className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
                  >
                    {t("guestEmptySignIn")}
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
                  >
                    {t("backToDashboard")}
                  </Link>
                )
              }
            />
          </div>
        ) : (
          filtered.map((teacher) => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              onboardingNext={onboardingHref}
              onboardingStep={params.onboardingStep ?? null}
            />
          ))
        )}
      </div>
    </main>
  );
}
