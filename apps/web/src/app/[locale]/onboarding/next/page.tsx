import { getLocale, getTranslations } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/onboarding-gate";
import { getStudentPostOnboardingRoute } from "@/lib/onboarding-routing";

export default async function OnboardingNextPage() {
  const locale = await getLocale();
  const t = await getTranslations("onboarding");
  const user = await requireAuth(locale);

  if (user.role !== "STUDENT") {
    redirect({ href: "/dashboard", locale });
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: {
      onboardingCompletedAt: true,
      placedLevel: true,
    },
  });

  if (!profile?.onboardingCompletedAt) {
    redirect({ href: "/onboarding", locale });
  }

  const placedLevel = profile?.placedLevel ?? "UNSET";

  if (placedLevel !== "UNSET") {
    redirect({ href: getStudentPostOnboardingRoute(placedLevel), locale });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">{t("nextTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{t("nextSubtitle")}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/placement"
          className="rounded-2xl border border-border bg-surface p-5 text-foreground hover:bg-[var(--app-hover)]"
        >
          <p className="text-base font-semibold">{t("takePlacementNow")}</p>
          <p className="mt-1 text-sm text-muted">{t("takePlacementNowHelp")}</p>
        </Link>
        <Link
          href="/book"
          className="rounded-2xl border border-border bg-surface p-5 text-foreground hover:bg-[var(--app-hover)]"
        >
          <p className="text-base font-semibold">{t("chooseTeacherNow")}</p>
          <p className="mt-1 text-sm text-muted">{t("chooseTeacherNowHelp")}</p>
        </Link>
      </div>
    </main>
  );
}
