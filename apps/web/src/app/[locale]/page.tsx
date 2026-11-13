import { LearningLanding } from "@/components/marketing/learning-landing";
import { getRequestLearningSite } from "@/lib/learning-site-request";
import { LEARNING_JOURNEYS } from "@/lib/learning-journey";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedDefaultRoute } from "@/lib/authenticated-default-route";
import { LearningChoice } from "@/components/marketing/learning-choice";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const site = await getRequestLearningSite();
  if (site?.learningLanguage) {
    const t = await getTranslations({ locale, namespace: LEARNING_JOURNEYS[site.learningLanguage].landingNamespace });
    return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: locale === "en" ? `${site.origin}/en` : site.origin } };
  }
  const t = await getTranslations({ locale, namespace: "learningJourney" });
  return {
    title: t("choiceTitle"),
    description: t("choiceIntro"),
  };
}

export default async function HomePage() {
  const site = await getRequestLearningSite();
  if (site?.learningLanguage) return <LearningLanding learningLanguage={site.learningLanguage} />;
  const session = await auth();

  if (session?.user?.id) {
    const locale = await getLocale();
    const href = await getAuthenticatedHomeRedirect(session.user);
    redirect({ href, locale });
  }

  return <LearningChoice />;
}

async function getAuthenticatedHomeRedirect(user: { id: string; role: string }) {
  if (user.role === "STUDENT") {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { onboardingCompletedAt: true },
    });
    return getAuthenticatedDefaultRoute({
      role: user.role,
      studentOnboardingCompleted: Boolean(profile?.onboardingCompletedAt),
    });
  }

  if (user.role === "TEACHER") {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId: user.id },
      select: { onboardingCompletedAt: true },
    });
    return getAuthenticatedDefaultRoute({
      role: user.role,
      teacherOnboardingCompleted: Boolean(profile?.onboardingCompletedAt),
    });
  }

  return getAuthenticatedDefaultRoute({ role: user.role });
}
