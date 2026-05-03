import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedDefaultRoute } from "@/lib/authenticated-default-route";
import { LandingHero } from "@/components/marketing/landing-hero";
import { LandingHowItWorks } from "@/components/marketing/landing-how-it-works";
import { LandingPillars } from "@/components/marketing/landing-pillars";
import { LandingTrust } from "@/components/marketing/landing-trust";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "landing" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.id) {
    const locale = await getLocale();
    const href = await getAuthenticatedHomeRedirect(session.user);
    redirect({ href, locale });
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-1 flex-col px-4 py-12 sm:px-6">
      <LandingHero />
      <LandingHowItWorks />
      <LandingPillars />
      <LandingTrust />
    </main>
  );
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
